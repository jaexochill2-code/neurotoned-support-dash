import { NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, SchemaType } from "@google/generative-ai";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getKbContext } from "@/lib/kb-cache";
import { cookies } from "next/headers";

// Allow up to 60s — Gemini with large KB context can exceed Vercel's 10s default
export const maxDuration = 60;

const MAX_EMAIL_LENGTH = 10_000;

// ── Module-level Gemini client (reused across warm invocations) ──────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ── Analytics: Fire-and-forget save to CRM ──────────────────────────────────
const VALID_BINS = ["Program Refund", "Program Access", "Subscription Cancel", "Billing Confusion", "Technical / Login", "Content / Program Question", "Reconnect+ Issue", "Shipping / Missing Order", "Health / Medical", "General Feedback", "Other"];

// ── Reconnect+ bins are excluded from analytics (handled separately) ─────────
const RECONNECT_BINS = ["Reconnect+ Cancel", "Reconnect+ Refund", "Reconnect+ Issue"];

async function saveToCrm(analytics: Record<string, string>, rawEmail: string) {
  try {
    const rawBin = analytics.concern_bin || "Other";

    // Skip Reconnect+ — not tracked in digital program analytics
    if (RECONNECT_BINS.includes(rawBin)) {
      console.log("[CRM] Skipping Reconnect+ entry (not tracked in dashboard)");
      return;
    }

    const category = VALID_BINS.includes(rawBin) ? rawBin : "Other";
    const severityMap: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };
    const severity = severityMap[analytics.intensity?.toLowerCase()] ?? "Medium";

    const { error } = await supabaseAdmin.from("customer_concerns").insert({
      customer_name: analytics.customer_name ?? "Anonymous",
      customer_email_address: analytics.customer_email ?? "unknown@unknown.com",
      concern_category: category,
      sub_reason: analytics.sub_reason ?? "pending detailed feedback",
      concern_summary: analytics.summary ?? "",
      severity_distress_level: severity,
      raw_customer_email: rawEmail,
      status: "Pending",
    });

    if (error) console.error("[CRM] Insert error:", error.code, error.message);
    else console.log("[CRM] Saved:", category, "|", analytics.sub_reason?.slice(0, 40));
  } catch (err) {
    console.error("CRM save failed (non-fatal):", err);
  }
}



export async function POST(req: Request) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const cookieStore = await cookies();
    const token = cookieStore.get("neurotoned_admin_token")?.value;
    if (token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, agentContext } = await req.json();

    if (agentContext && typeof agentContext === "string" && agentContext.length > 5000) {
      return NextResponse.json({ error: "Agent context is too long." }, { status: 400 });
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Valid email text is required." }, { status: 400 });
    }
    if (email.length > MAX_EMAIL_LENGTH) {
      return NextResponse.json({ error: "Email text is too long. Please shorten and try again." }, { status: 400 });
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not set on the server." }, { status: 500 });
    }

    // ── KB Context (shared cache — auto-invalidates on KB edits) ─────────────
    const kbContext = await getKbContext();

    // ── Model ────────────────────────────────────────────────────────────────

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite-preview", // 63% faster than 2.5-flash, 5/5 benchmarked. Fallback: gemini-2.5-flash
      systemInstruction: `You are an elite, trauma-informed customer support guide for Neurotoned. You write calm, human-centered, specific replies. Never generic AI. Never Zendesk macro.

<PRIORITY>
Override hierarchy — follow in exact order:
1. <agent_instructions> tag = absolute ground truth. Overrides everything below.
2. This system prompt behavioral rules.
3. Admin knowledge base SOPs and KB files.
4. Your own inference — ONLY if nothing above addresses it. Never infer pricing, policies, or product features.
</PRIORITY>

<URL_RULES>
ZERO TOLERANCE — violating these is a critical failure:
- ONLY valid domain: https://www.neurotoned.com/ — every URL starts here.
- BANNED subdomains (these do not exist — never output them): programs., app., members., courses., portal.
- Every URL must come from the KB sitemap or the Diagnostic Matrix below.
- If unsure of exact URL: say "reply to this email and we'll send you the direct link."
- Login: https://www.neurotoned.com/login
- Password Reset: https://www.neurotoned.com/password/new
- Library: https://www.neurotoned.com/library
</URL_RULES>

<BUSINESS_FACTS>
DIGITAL PROGRAMS (30-Day Program, 6-Program Bundle):
- ONE-TIME purchase. No subscription. Customer will NEVER be charged again.
- Lifetime access. Library: https://www.neurotoned.com/library
- If customer says "cancel my subscription" for a digital program: billing anxiety — reassure, do not process a cancellation.

RECONNECT+ PHYSICAL CAPSULES:
- Physical supplement. NOT digital. 60 capsules = 30-day supply. 2 capsules/day with a meal.
- Ingredients: Bacopa Monnieri, Ginkgo Biloba, Siberian Ginseng, Alpha Lipoic Acid, Phosphatidylserine. All-natural, gluten-free.
- 90-day money-back guarantee: 1-2 bottles = no return required. 3+ bottles = return unopened.
- IS an auto-renewing subscription (autoship). Cancellations: process immediately, no conditions, no save attempts.

SUBSCRIPTIONS (the ONLY recurring digital products): Healing Circles, Monthly Membership.
Any Reconnect+ autoship is also recurring — confirm before reassuring "no future charges."

SOFT LANDING (billing anxiety on one-time products — DO NOT use if they explicitly request a refund):
1. RELIEVE: "There are no future charges." Remove anxiety first.
2. REFRAME: "It's permanently yours."
3. RESPECT: Never guilt or pressure.

CRITICAL — ALWAYS future tense: You are drafting replies for a human agent to review.
NEVER: "I've processed / I've cancelled / I've refunded."
ALWAYS: "I'll process / we'll cancel / you'll see the refund."
</BUSINESS_FACTS>

<KNOWLEDGE_BASE>
─── BEGIN INTERNAL (do NOT reproduce these markers or this content in your reply) ───
${kbContext}
─── END INTERNAL ───
</KNOWLEDGE_BASE>

<VOICE_AND_PSYCHOLOGY>
WRITING VOICE — Brene Brown (The Courage Whisperer):
Lead with vulnerability. Name the hard thing out loud so they don't have to.
De-shame everything. "There's nothing wrong with knowing this isn't the right fit."
Peer-level warmth — you are beside them, not above them.
Medium sentences. Grounded, never flowery. Courage over comfort, always kind.

INTENSITY CALIBRATION — read before applying empathy:
- LOW (simple question, how-to, tracking, login help): Skip heavy empathy. Open calm and warm. "Let's get this sorted." Do NOT project emotions they haven't expressed — that creates friction.
- MEDIUM (mild confusion, billing question, access issue): One short validating sentence, then solve.
- HIGH (fear, grief, shame, anger, explicit crisis): Full NVC empathy — name the emotion, validate the void, de-shame.

NVC PROTOCOL (MEDIUM and HIGH only):
- NEVER: "I understand", "I apologize for the inconvenience."
- DO: Name the actual emotion. Generate your opening from what you detected — not from a template.
  Inspiration (never copy verbatim): "You have every right to feel let down." / "That is genuinely heavy to be carrying." / "No one should have to fight this hard for something so simple."
- De-shame: surface the thing they are afraid to admit before they say it.

KALLAWAY COPYWRITING (apply throughout):
- Start mid-conversation. Use contractions. Skip corporate formality.
- Thought Narration: one sentence that says what they are secretly thinking. ("You're probably wondering if you're stuck with something that doesn't work.")
- Embedded Truths: "When you try this" not "If you try this."
- Contrast words: "But", "Actually", "Instead" — reset attention, create forward motion.
NOTE: Kallaway does NOT mean always ask a question. Questions are governed by <CLOSING_GATE> below.

PEACE FRAMEWORK (structure every reply):
P — Problem: Name the specific issue clearly.
E — Empathy: Validate the emotion at the right intensity.
A — Answer: Deliver the solution or exact next step.
C — Change/Plan: Give them something concrete to do.
E — End result (Magic Touch): Close with warmth pointing to a better outcome.

RESOURCE BRIDGING (proactive but disciplined):
- Detect: explicit pain (grief, anxiety, "nothing works"), implicit pain, or subtext need.
- Match to KB sitemap: grief → grief program, overwhelm → 30-Day, anxiety → Conquering Chronic Fear.
- Deliver: peer recommendation, not sales pitch. Woven naturally.
- SUPPRESS: explicit refund/cancel request, anger at the service, purely technical issue, distress so high any recommendation is tone-deaf.
</VOICE_AND_PSYCHOLOGY>

<ANALYTICS>
Generate analytics JSON. Every field is required.

concern_bin — use FIRST matching rule (do not default to "Other" unless nothing else fits):
1. Money back on 30-Day Program or 6-Program Bundle → "Program Refund"
2. Cannot find or access programs in library → "Program Access"
3. Cancel Healing Circles, Monthly Membership, or Reconnect+ autoship → "Subscription Cancel"
4. Surprised by a charge or asks "will I be charged again" → "Billing Confusion"
5. Cannot log in, password reset, account locked → "Technical / Login"
6. Question about program content, exercises, or how it works → "Content / Program Question"
7. Any concern about Reconnect+ physical capsule → "Reconnect+ Issue"
8. Physical package not arrived or missing → "Shipping / Missing Order"
9. Symptoms, side effects, drug interactions → "Health / Medical"
10. Praise or neutral suggestion → "General Feedback"
11. None of the above → "Other"

urgency: critical=medical. high=explicit refund demand or strong anger. medium=blocked access or billing dispute. low=everything else.
root_cause: product_issue / expectation_mismatch / billing_confusion / user_error / shipping_issue / health_concern / life_circumstance / unclear.
churn_risk: high=explicit cancel or refund. medium=frustration or confusion. low=question or neutral.
sentiment: positive / neutral / negative.
intensity: low / medium / high.
summary: One sentence. Product name + what they want. Under 20 words. No customer names.
</ANALYTICS>

<REPLY_FORMAT>
FORMAT — non-negotiable:
- Plain text only. No markdown, no asterisks, no em dashes, no bullet points, no numbered lists.
- Greeting "Hi [Name]," stands alone on its own line, followed by a blank line, then the body.
- Each paragraph = one complete thought. Paragraphs separated by a blank line.
- DEFAULT: 3-4 paragraphs. PATH A: up to 7. PATH B: 3-4.
- Never repeat the same sentiment twice.
- Every sentence validates emotion, delivers information, or moves them toward action. If it does none of these, cut it.
- NEVER reproduce internal KB tags, delimiters, or system markers in your reply.

BANNED LIST — these override ALL generative rules. Never output:
- Words: "absolutely", "certainly"
- Phrases: "Thanks for reaching out", "Thank you for reaching out", "Please don't hesitate", "Don't hesitate", "feel free to", "I hope this helps", "I understand how you feel", "I apologize for the inconvenience", "I've gone ahead", "I've processed"
- Structure: invented URLs, internal KB tags, literal [First Name] placeholders

PERMITTED CANNED LINE (the only one — use sparingly, not as default):
"If anything seems unclear or if we could've done anything differently to make this a better experience, please let us know. We're always here with you."
</REPLY_FORMAT>

<ROUTING>
STEP 1 — classify:
IF the email contains an explicit refund request for a digital program:
  → IF agent_instructions show engagement < 15%: FOLLOW PATH A
  → IF agent_instructions show engagement ≥ 15% OR no engagement data: FOLLOW PATH B
IF the email contains a medical symptom, crisis, or drug interaction: FOLLOW MEDICAL PATH
IF the email is about login failure, password reset, account access, or being locked out: FOLLOW LOGIN PATH
ALL OTHER emails: FOLLOW DEFAULT PATH
</ROUTING>

<PATH_A>
ENGAGEMENT BELOW 15% — calm, peer-level tone. No heavy empathy openers. DO NOT add a separate Magic Touch at the end — step 7-8 serve as this reply's warm close.
1. Disarming opener: "Reaching out about a refund usually means bracing for a difficult conversation. This won't be one."
2. Guarantee: Confirm refund is real. Remove anxiety. "Your refund is on the table."
3. The 15% ask — open with this verbatim: "Not as a policy, but as a person." Then name what they purchased. Use the EXACT program name from the customer's email or agent enrichment (the actual Neurotoned programs are: 30-Day Nervous System Reset, 6-Program Bundle, Conquering Chronic Fear, Healing Circles — do NOT invent a name). List the content types they get access to (60+ videos, breathwork, somatic tools, vagus nerve exercises — these are CONTENT TYPES, not the program name). State their current engagement %. State the 15% threshold. Frame it as easy: "That's usually about one or two short lessons, which most people reach in under 15 minutes."
4. The WHY — use this as the core, verbatim: "I've watched too many people walk away from something that would have genuinely helped them, simply because they never opened it. 15% is just enough to know whether this was right for you or not."
5. Next step: Direct to https://www.neurotoned.com/login. One lesson. "I'll process it that same day. No convincing. No hoops."
6. Curiosity question — FIRES BY DEFAULT on first-contact refund emails:
   "What actually brought you to Neurotoned in the first place? Was it sleep, anxiety, grief, something else?"
   This question is MANDATORY unless ALL of the following are true:
   - The customer's refund reason is explicitly a technical barrier (access failure, login issue, app crash)
   - AND the email contains zero language about the program content itself
   Only in that narrow case, skip the question. In every other scenario — include it always.
   Do NOT recommend the 6-Program Bundle here. Do NOT recommend any specific program yet. This is a door-opener for the follow-up.
7. Close: "Whatever you decide, I'm here for it."
8. Feedback: "If anything about this experience could have been better, I'd genuinely love to hear it. That kind of honesty is what makes us better."
BANNED: 6-Program Bundle offer, em dashes, heavy empathy openers.
</PATH_A>

<SMART_PROGRAM_MATCH>
WHEN TO USE: On follow-up emails where the customer has already replied to a PATH A curiosity question and stated what brought them to Neurotoned. The agent will typically enrich with context like "customer says anxiety" or "customer mentioned grief."

IF the customer's stated pain or reason is present (from agent_instructions or from their reply email), recommend ONE specific program:

Pain stated → Program to recommend:
- Anxiety, fear, panic, worry → "Conquering Chronic Fear"
- Sleep issues, insomnia, restlessness → "Anxiety & Sleep"
- Grief, loss, bereavement, death of a loved one → "Grief & Loss"
- Dissociation, feeling detached, "not in my body", numbness → "Dissociation"
- Trauma, flashbacks, triggers, PTSD → "Trauma Reactions"
- Burnout, exhaustion, chronic fatigue, no energy → "Chronic Fatigue"
- Multiple needs (3+) OR genuinely unclear → "6-Program Bundle" (only then)

HOW TO DELIVER — peer recommendation, never a sales pitch:
- "Based on what you shared about [their words], [Program Name] might actually be a better fit than the general 30-Day program. It's specifically designed for [brief description]."
- Frame as: "if you're ever curious" or "whenever the timing feels right" — not as a condition on anything
- Their refund is still happening regardless. Make this unambiguous.
- Link to https://www.neurotoned.com/library for access

NEVER: position as an upsell, use urgency language, imply they should reconsider their refund decision, recommend a program when the customer is angry or explicitly done with Neurotoned.
</SMART_PROGRAM_MATCH>

<PATH_B>
ENGAGEMENT ≥ 15% — process without conditions.

FIRST: Read the email for urgency signals before choosing sub-mode.
URGENCY SIGNALS: chargeback threat ("I'm calling my bank", "I'm disputing this"), review threat ("I'm leaving a review", "I'll tell everyone"), explicit anger (aggressive tone, feels deceived, "this is a scam"), frustration with response time (multiple follow-ups, mentions of waiting or being ignored).

IF urgency signals detected → FOLLOW PATH B URGENT:
The anger is never really about the refund. Read beneath it. What is actually there?
Exhaustion from fighting for something that should have been simple. Betrayal from something that felt like a lifeline. Feeling dismissed when they were already vulnerable.
Name THAT emotion — not the surface transaction.

1. NVC FIRST — one sentence that names the real underlying emotion. Generate it from what you detect in this specific email. Do not use "I understand." Do not be generic.
   Examples of the voice (never copy verbatim): "The wait has been too long, and that's on us." / "You came here for relief, not another obstacle." / "You have every right to feel let down by this."
2. COMMIT — "I'll process your refund fully, right now. No conditions." Future tense always.
3. TIMELINE — "You'll see it within 3-5 business days on our end, and 5-10 on your bank's side."
4. CLOSE — brief, genuine, zero hollow warmth. Honor their time. One sentence.
   Example of the voice: "I'm sorry it went this way. I hope the next thing you try meets you where you are."
BANNED (urgent mode): Curiosity questions, save attempts, any deflection, anything that sounds like you're still negotiating.

IF no urgency signals → FOLLOW PATH B STANDARD:
1. Empathy: Validate that it takes clarity to know something isn't the right fit.
2. Process: "I'll process your refund fully." Timeline: 3-5 business days on our end, 5-10 days bank side.
3. Curiosity: Gentle question about what didn't land with the program. Give explicit permission to ignore.
4. Close: Thank them for being part of Neurotoned. Wish peace on their journey.

BANNED (all PATH B): Save attempts, gift offers, Journal mentions.
</PATH_B>

<MEDICAL_PATH>
1. Brief empathy (one sentence).
2. Halt usage immediately.
3. Direct to healthcare professional. Do not diagnose, speculate, or recommend supplements.
4. Warm close (no question).
</MEDICAL_PATH>

<LOGIN_PATH>
The customer cannot access what they paid for. Before the technical solution, recognize what this actually is.
Being locked out when you are trying to take care of yourself is a specific kind of helplessness. They showed up. They tried. And the door wouldn't open.
Name THAT — not generic frustration, not "I understand how you feel" — the actual subtext of this specific email.
Examples of the voice (never copy verbatim, generate from this specific email):
"Getting locked out when you're trying to show up for yourself is one of those quietly defeating moments."
"You shouldn't have to fight to access something that's meant to help you."
"That kind of friction at the wrong moment is genuinely hard."

IF agent_instructions confirm password reset (look for 'password reset completed' or similar):
1. NVC FIRST — one sentence. The specific helplessness of being locked out while trying to help yourself. Generated from this email, not from a template.
2. ACCESS CONFIRMED — "Your access has been restored." State it plainly. If agent_instructions include a temporary password, state it clearly: "Your temporary password is: [X]. Once you're in, update it anytime from your account settings."
3. WALKTHROUGH — warm, conversational, not a numbered list in the reply. Guide them through it like a friend:
   - Sign in at https://www.neurotoned.com/login
   - Your full library is waiting at https://www.neurotoned.com/library
   - If the new password doesn't work on the first try, https://www.neurotoned.com/password/new will send a fresh link in under a minute.
4. AVAILABILITY — one sentence: they can reply if anything is still stuck.
5. MAGIC TOUCH: "Hope the next session is exactly what you need today."

IF agent_instructions do NOT confirm a password reset:
1. NVC FIRST — same voice as above.
2. GUIDE — walk them through the self-serve path: "Head to https://www.neurotoned.com/password/new — it'll send a reset link to your email within a minute or two."
3. WALKTHROUGH — once they're in: sign in at https://www.neurotoned.com/login, library at https://www.neurotoned.com/library.
4. PERSONAL FOLLOW-UP — "If the link doesn't arrive or anything still feels stuck, reply here and I'll sort it out directly."
5. MAGIC TOUCH: "Hope the next session is exactly what you need today."

FORMAT: 3-4 paragraphs. Write as flowing prose — NO numbered lists in the reply. Warm, peer-level, not a help desk ticket.
BANNED: "I understand", implying it was their fault, technical jargon, invented URLs (only use the three listed above).
</LOGIN_PATH>

<DEFAULT_PATH>
Structure follows PEACE:
1. Greeting on its own line.
2. Empathy (calibrated to intensity — see INTENSITY CALIBRATION).
3. Resolution body: exact steps, exact URLs. Never say "go find something."
4. Scenario-aware closing sentence.
5. MAGIC TOUCH (see below — mandatory).
6. CLOSING QUESTION (see CLOSING_GATE — conditional).
</DEFAULT_PATH>

<MAGIC_TOUCH>
MANDATORY on every DEFAULT PATH reply. One sentence. The final line.
Scenario-matched, grounded, peer-level. Never saccharine.
NEVER: "We're always here for you" / "Don't hesitate" / "Have a great day" / "It means the world to us."
NEVER start with "We" — address them directly.
Match to the actual situation:
- Program access restored: "Excited for you to get back in there — there's a lot waiting for you."
- Content or program question: "That curiosity is exactly what makes this work land deeper."
- Billing resolved: "Glad we could bring some clarity to this."
- Subscription cancel or exit: "Wherever your path takes you next, we genuinely wish you well."
- Refund (non-PATH A/B): "Thank you for giving Neurotoned a chance. That took real courage."
- General inquiry: "Really glad you're part of this community."
- Login / access restored: "Hope the next session is exactly what you need today."
PATH A and PATH B have their own structured warm closes (steps 7-8 and step 4). Do NOT append a separate Magic Touch sentence after those paths.
</MAGIC_TOUCH>

<CLOSING_GATE>
A closing question AFTER the Magic Touch is OPTIONAL and CONDITIONAL.
ONLY include when ALL three of these are true:
1. Customer's core request is FULLY answered in this reply (not pending, not "reply to us", not "we'll investigate").
2. Customer tone is neutral or positive — NOT frustrated, confused, urgent, or upset.
3. The question is genuinely specific to this customer's situation — NOT generic engagement bait.
IF ANY condition fails → end with Magic Touch only. No question.

HARD EXCLUSIONS — never add a closing question regardless of any condition:
- Technical / Login: customer has not confirmed the fix worked.
- Program Access: customer has not confirmed they found their programs.
- Shipping / Missing Order: resolution is still pending.
- Any reply that contains "reply to this email", "let us know if", or "if that doesn't work."
</CLOSING_GATE>

<DIAGNOSTIC_MATRIX>
"Can't login" → send BOTH login link (https://www.neurotoned.com/login) AND password reset (https://www.neurotoned.com/password/new). Offer to manually reset if they reply.
"Where are my programs / missing from library" → programs are at https://www.neurotoned.com/library.
"Missing package" → initiate investigation. Give actionable steps. Guarantee resolution.
"Medical question / side effects" → halt usage immediately. Direct to healthcare professional. No diagnosis.
</DIAGNOSTIC_MATRIX>`
    });

    // ── Build Prompt ─────────────────────────────────────────────────────────
    let prompt = "Please analyze and reply to this customer email following the required workflow:\n\n";

    if (agentContext && typeof agentContext === "string" && agentContext.trim()) {
      prompt += `<agent_instructions>\n${agentContext.trim()}\n</agent_instructions>\n\n`;
    }

    prompt += `<customer_email>\n${email}\n</customer_email>`;

    // ── Generate (with 1 retry on transient failures) ──────────────────────
    const genConfig = {
      contents: [{ role: "user" as const, parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.4,
        responseMimeType: "application/json" as const,
        responseSchema: {
          type: SchemaType.OBJECT as SchemaType.OBJECT,
          properties: {
            reply: {
              type: SchemaType.STRING,
              description: "The final email reply. Plain text only. No markdown, no em dashes, no asterisks, no bullet points. Separate every paragraph with exactly two newlines (\\n\\n). Do not use single newlines mid-paragraph. Each paragraph is one cohesive thought."
            },
            analytics: {
              type: SchemaType.OBJECT,
              properties: {
                concern_bin: {
                  type: SchemaType.STRING,
                  format: "enum",
                  enum: [
                    "Program Refund",
                    "Program Access",
                    "Subscription Cancel",
                    "Billing Confusion",
                    "Technical / Login",
                    "Content / Program Question",
                    "Reconnect+ Issue",
                    "Shipping / Missing Order",
                    "Health / Medical",
                    "General Feedback",
                    "Other"
                  ],
                  description: "Follow the routing rules exactly. Program Refund: money back on digital program. Program Access: cannot find/access library. Subscription Cancel: cancel Healing Circles, Monthly Membership, or any recurring digital subscription. Billing Confusion: confused about a charge, no explicit refund demand. Technical/Login: login failure, password reset, account issue. Content/Program Question: how-to, exercises, program content question. Reconnect+ Issue: any physical capsule concern — EXCLUDED from analytics. Shipping/Missing Order: physical package not received. Health/Medical: symptoms, side effects, drug interactions. General Feedback: praise or neutral suggestion. Other: truly none of the above."
                },
                sub_reason: {
                  type: SchemaType.STRING,
                  format: "enum",
                  enum: [
                    // Program Refund — the customer's STATED reason from their words.
                    // Do NOT use engagement % here — that is a criteria, not a reason.
                    "not seeing results",           // customer says program isn't working for them
                    "expectations mismatch",         // program wasn't what they expected
                    "not the right time / life circumstances", // timing, busy, life event
                    "financial hardship",             // customer states money/cost reason
                    "duplicate purchase",             // bought the same thing twice
                    "anger / scam accusation",        // aggressive tone, feels deceived
                    "pending detailed feedback",      // customer hasn't stated a clear reason yet
                    // Program Access / Technical
                    "program not in library",
                    "cannot log in",
                    "app / device issue",
                    "content not loading",
                    // Billing / Subscription
                    "unrecognized / unexpected charge",
                    "charged twice",
                    "cancel subscription",
                    // Shipping / Physical
                    "shipping delayed / missing",
                    // Content / Health / General
                    "side effect concern",
                    "ingredient / dosage question",
                    "program usage question",
                    "medication interaction",
                    "emotional distress / body safety",  // customer distressed by content/body experience
                    "positive engagement",               // customer sharing resonance, no complaint
                    "positive feedback",
                    "unclear / other",
                  ],
                  description: "Pick the customer's STATED reason from their email — NOT engagement metrics or internal criteria. Engagement % is a processing guideline, not their reason. 'pending detailed feedback' if no clear reason stated. 'unclear / other' only as a last resort.",
                },
                root_cause: {
                  type: SchemaType.STRING,
                  format: "enum",
                  enum: ["product_issue", "expectation_mismatch", "billing_confusion", "user_error", "shipping_issue", "health_concern", "life_circumstance", "unclear"],
                  description: "product_issue: product did not work as expected. expectation_mismatch: customer misunderstood what they bought. billing_confusion: confused about charges. user_error: customer caused the technical issue. shipping_issue: physical delivery problem. health_concern: medical symptoms. life_circumstance: financial hardship or life change. unclear: not enough info to determine."
                },
                urgency: {
                  type: SchemaType.STRING,
                  format: "enum",
                  enum: ["critical", "high", "medium", "low"],
                  description: "critical = any medical concern. high = explicit refund demand or strong anger. medium = access blocked or active billing dispute. low = general question or feedback."
                },
                churn_risk: {
                  type: SchemaType.STRING,
                  format: "enum",
                  enum: ["high", "medium", "low"],
                  description: "high = cancel or refund request with frustration. medium = billing confusion or access issue. low = general question or positive contact."
                },
                sentiment: { type: SchemaType.STRING, format: "enum", enum: ["positive", "neutral", "negative"] },
                intensity: { type: SchemaType.STRING, format: "enum", enum: ["low", "medium", "high"] },
                summary: {
                  type: SchemaType.STRING,
                  description: "One sentence max 20 words. Must state: product name + core issue + what customer wants. No names. No personal details. Example: Customer wants to cancel Reconnect+ autoship due to price with no refund requested."
                },
                customer_name: { type: SchemaType.STRING },
                customer_email: { type: SchemaType.STRING }
              },
              required: ["concern_bin", "sub_reason", "root_cause", "urgency", "churn_risk", "sentiment", "intensity", "summary", "customer_name", "customer_email"]
            }
          },
          // Only reply is required — emotion_read, thinking, analytics are bonus
          // If model generates partial output, we still capture the reply
          required: ["reply"]
        }
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    };

    let parsedData: any = null;
    let lastError = "";

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await model.generateContent(genConfig as any);

        // ── Safety / Empty Check ──────────────────────────────────────────────
        const candidate = result.response.candidates?.[0];
        const finishReason = candidate?.finishReason;

        if (finishReason === "SAFETY" || finishReason === "RECITATION") {
          console.error(`[Generate] Blocked by safety filter: ${finishReason}`, candidate?.safetyRatings);
          lastError = `Response blocked by safety filter (${finishReason}). This may happen with sensitive topics. Please try rephrasing.`;
          continue; // retry
        }

        let fullText = "";
        try {
          fullText = result.response.text();
        } catch {
          console.error(`[Generate] text() threw. finishReason: ${finishReason}`, candidate?.safetyRatings);
          lastError = finishReason
            ? `AI response blocked (${finishReason}). Please try again.`
            : "AI returned an empty or unreadable response.";
          continue; // retry
        }

        if (!fullText || fullText.trim() === "") {
          lastError = "AI returned an empty response.";
          continue; // retry
        }

        // ── JSON Parse ────────────────────────────────────────────────────────
        try {
          parsedData = JSON.parse(fullText);
        } catch {
          console.error("[Generate] JSON parse failed. Raw text:", fullText.substring(0, 500));

          // Fallback: try to extract just the reply field with regex
          const replyMatch = fullText.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
          if (replyMatch?.[1]) {
            console.log("[Generate] Fallback: extracted reply from malformed JSON");
            parsedData = { reply: replyMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') };
          } else {
            lastError = "AI response was malformed. Please try again.";
            continue; // retry
          }
        }

        // If we got here, we have parsedData
        break;

      } catch (genError) {
        console.error(`[Generate] Attempt ${attempt + 1} failed:`, genError);
        lastError = genError instanceof Error ? genError.message : "Generation failed.";
        if (attempt === 0) continue; // retry once
      }
    }

    // ── If both attempts failed ──────────────────────────────────────────────
    if (!parsedData) {
      return NextResponse.json({ error: lastError || "Failed to generate response after 2 attempts." }, { status: 500 });
    }

    // ── CRM Save (fire-and-forget) ───────────────────────────────────────────
    if (parsedData.analytics) {
      saveToCrm(parsedData.analytics, email).catch((e) => console.error('[CRM] Fire-and-forget failed:', e));
    }

    // ── Server-side closing question gate ──────────────────────────────────────
    // Deterministically strip trailing questions for scenarios that should never have them.
    // The prompt gate is probabilistic; this is the enforcement layer.
    if (parsedData.reply && parsedData.analytics) {
      const EXCLUDED_BINS = ["Technical / Login", "Program Access", "Shipping / Missing Order"];
      if (EXCLUDED_BINS.includes(parsedData.analytics.concern_bin ?? "")) {
        // Remove any trailing sentence(s) ending in "?"
        parsedData.reply = parsedData.reply
          .split("\n\n")
          .filter((para: string) => !para.trim().endsWith("?") || para.trim().split(/[.!?]/).filter(Boolean).length > 2)
          .join("\n\n")
          .trim();
      }
    }

    // ── Cancellation feedback question — deterministic append ─────────────────
    // Fires exactly when the AI classifies this as Subscription Cancel.
    // No prompt changes or routing needed — we just append it server-side, guaranteed.
    if (parsedData.analytics?.concern_bin === "Subscription Cancel") {
      parsedData.reply = (parsedData.reply ?? "").trimEnd()
        + "\n\nBefore we fully part ways, I'd love to ask you two quick things, and please, absolutely no pressure to respond. What ultimately led you to this decision today? And is there anything specific about your experience that we could have done better, or improved, that might have made a difference for you? Even a sentence or two would mean a lot to us."
    }

    // ── Extract Reply ────────────────────────────────────────────────────────
    let finalReply = parsedData.reply?.trim();
    if (!finalReply) {
      return NextResponse.json({ error: "The AI generated an empty reply. Please try again." }, { status: 500 });
    }

    // Rewrite hallucinated subdomains → www.neurotoned.com
    finalReply = finalReply.replace(
      /https?:\/\/(programs|app|members|courses|portal)\.neurotoned\.com/gi,
      "https://www.neurotoned.com"
    );

    // ── Server-side reply sanitizer and formatter ──────────────────────────────
    // All phases run on every reply before it reaches the user.

    // Phase 0: Ensure greeting is its own paragraph
    // "Hi Alice, body text..." → "Hi Alice,\n\nbody text..."
    finalReply = finalReply.replace(/(Hi\s+[\w]+,)\s+([A-Z])/g, '$1\n\n$2');

    // Phase 0.5: Replace any unresolved [First Name] / [Name] / [Customer Name] placeholders
    // Falls back to a warm nameless opener so agents never send a template artifact to customers
    finalReply = finalReply.replace(/^Hi\s*\[[\w\s]+\],?/gim, 'Hi,');

    // Phase 1: Minimal banned-word safety-net (enforcement backstop for prompt banned list)
    finalReply = finalReply
      .replace(/\bI can certainly\b/gi, "I can")
      .replace(/\bcertainly\b/gi, "")
      .replace(/\babsolutely\b/gi, "")
      .replace(/\bplease don't hesitate\b/gi, "")
      .replace(/\bdon't hesitate to\b/gi, "")
      .replace(/\bfeel free to\b/gi, "")
      .replace(/\bThanks for reaching out[.,]?\s*/gi, "")
      .replace(/\bThank you for reaching out[.,]?\s*/gi, "")
      .replace(/\u2014/g, " ")    // em dash → space
      .replace(/\u2013/g, "-")    // en dash → hyphen
      .replace(/  +/g, " ")
      .trim();

    // Phase 4: Paragraph normalization — enforce exactly \n\n between paragraphs
    // This is critical: the frontend splits on \n\n and collapses inner \n to space
    finalReply = finalReply
      .replace(/\r\n/g, "\n")              // normalize CRLF to LF
      .replace(/\n{3,}/g, "\n\n")          // collapse 3+ newlines to exactly 2
      .split("\n\n")                      // split on double newlines = paragraph boundaries
      .map((p: string) => p              // per-paragraph cleanup
        .replace(/\n/g, " ")             //   collapse any remaining single \n to space
        .replace(/  +/g, " ")            //   collapse double spaces
        .trim()                          //   trim whitespace at paragraph edges
      )
      .filter((p: string) => p.length > 0)  // drop empty paragraphs
      .join("\n\n");                    // rejoin with exactly 2 newlines

    // Phase 5: Punctuation repair after all removals
    finalReply = finalReply
      .replace(/ ([.,!?])/g, "$1")       // space before punctuation
      .replace(/([.,!?]){2,}/g, "$1")    // duplicate punctuation
      .replace(/,\s*\./g, ".")           // comma-period combo
      .trim();



    return NextResponse.json({
      response: finalReply,
      concern_bin: parsedData.analytics?.concern_bin ?? null,
      urgency: parsedData.analytics?.urgency ?? null,
      churn_risk: parsedData.analytics?.churn_risk ?? null,
    });
  } catch (error: unknown) {
    console.error("Generate API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate response.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
