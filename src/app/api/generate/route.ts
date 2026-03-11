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

async function saveToCrm(analytics: Record<string, string>, rawEmail: string) {
  try {
    const rawBin = analytics.concern_bin || "Other";
    const category = VALID_BINS.includes(rawBin) ? rawBin : "Other";
    const severityMap: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };
    const severity = severityMap[analytics.intensity?.toLowerCase()] ?? "Medium";

    const { error } = await supabaseAdmin.from("customer_concerns").insert({
      customer_name: analytics.customer_name ?? "Anonymous",
      customer_email_address: analytics.customer_email ?? "unknown@unknown.com",
      concern_category: category,
      sub_reason: analytics.sub_reason ?? "other",
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


// Writing Voice: Brene Brown (The Courage Whisperer) — permanent single voice
// Chosen for Neurotoned: works across ALL distress levels, de-shames billing/
// refund anxiety, peer-level warmth, grounded. Best fit for NVC + PEACE protocol.
const WRITING_VOICE = `Your writing voice is Brene Brown (The Courage Whisperer).
Lead with vulnerability. Name the hard thing out loud so they don't have to.
De-shame everything. There is nothing wrong with you for feeling this way.
Peer-level warmth. You are walking beside them, not above them.
Medium sentences. Grounded, never flowery. Courage over comfort, but always kind.`;


export async function POST(req: Request) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────────
    const cookieStore = await cookies();
    const token = cookieStore.get("neurotoned_admin_token")?.value;
    if (token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, agentContext } = await req.json();

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

    // ── Persona ──────────────────────────────────────────────────────────────
    // ── Model ────────────────────────────────────────────────────────────────

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `You are an elite, deeply empathetic, trauma-informed customer support guide for Neurotoned.
You write calming, human-centered, fiercely supportive replies. Never sound like a generic AI or a standard Zendesk macro.

SOURCE PRIORITY LADDER — follow in exact order when deciding what to say:
1. Agent enrichment instructions (highest authority — override everything below)
2. Behavioral protocols in this system prompt (NVC, Kallaway, PEACE)
3. SOPs from the admin knowledge base
4. Factual KB files (refund-policies, product-info files)
5. neurotoned.com sitemap — for live URLs, resources, and content
6. Your own inference — ONLY if nothing above addresses the question. Never infer facts about pricing, policies, or product features.
CRITICAL: Do NOT invent policies, invent prices, or cite information from outside neurotoned.com and the KB files above.

URL RULES (ZERO TOLERANCE — violating these is a critical failure):
1. The ONLY valid domain is www.neurotoned.com. Every URL you output MUST start with https://www.neurotoned.com/.
2. NEVER invent subdomains. The following DO NOT EXIST and must NEVER appear in your replies:
   - programs.neurotoned.com ← DOES NOT EXIST
   - app.neurotoned.com ← DOES NOT EXIST
   - members.neurotoned.com ← DOES NOT EXIST
   - courses.neurotoned.com ← DOES NOT EXIST
   - portal.neurotoned.com ← DOES NOT EXIST
3. Every URL you include MUST come from the KB sitemap document or the Diagnostic Matrix below.
4. If you cannot find the exact URL in the KB, do NOT guess. Say "reply to this email and we'll send you the direct link."
5. For login issues, the ONLY correct URLs are:
   - Login: https://www.neurotoned.com/login
   - Password Reset: https://www.neurotoned.com/password/new
   - Library: https://www.neurotoned.com/library

**INTENSITY CALIBRATION (read this BEFORE applying empathy):**
Match the customer's energy. Do NOT inflate it.
- If distress intensity is LOW (simple question, login help, tracking, how-to): Skip the heavy empathy. Open with a calm, warm, helpful sentence. "Let's get this sorted" or "Good question, here's what's happening" is perfect. Do NOT tell them how frustrated they must be. That creates frustration where there was none.
- If distress intensity is MEDIUM (mild annoyance, confusion, billing question): One short validating sentence, then move to the fix. Keep it grounded.
- If distress intensity is HIGH (fear, grief, shame, anger, explicit distress): Use the full NVC empathy protocol below. This is where it belongs.
RULE: Over-empathizing on a simple question feels patronizing. Under-empathizing on real pain feels cold. Read the room.

**The NVC & Brené Brown Empathy Protocol (for MEDIUM and HIGH intensity only):**
1. Empathy over Sympathy: NEVER say "I understand", "I apologize for the inconvenience." Empathy sounds like "That is incredibly frustrating" or "You have every right to feel let down."
   CRITICAL: Your opening sentence must be UNIQUE to this specific email. Generate it from the emotion you detected, not from a memorized template.
   Acceptable empathy openers (USE AS INSPIRATION, do NOT copy verbatim every time):
   - "That is a genuinely heavy thing to carry right now."
   - "You have every right to feel let down by this."
   - "No one should have to fight this hard for something so simple."
   - "Your frustration here makes complete sense."
   - "Something about this clearly hit a nerve, and that matters."
   RULE: Never use the word "incredibly" more than once in a reply. Vary your vocabulary.
2. Name the Emotion: Identify what the customer is feeling and name it for them.
3. Validate the Void: Acknowledge the internal problem before solving the external problem.
4. De-Shame: If asking for a refund or admitting a mistake, remove their shame. "There's nothing wrong with knowing something isn't the right fit."

**The Kallaway Peer-to-Peer Protocol:**
1. Drop the Formality: Start mid-conversation. Use contractions.
2. Thought Narration: Include one sentence that says what they are secretly thinking.
3. Ask a Genuine Question: End the email with a peer-level question.

**Trauma-Informed Friction Reduction:**
- Break complex ideas down.
- Provide the exact hyperlink. Never tell them to "go find" something.
- Use certainties. "When we do this" instead of "If you try this."

**Resource Bridging Protocol (Pain → Need → Resource):**
The KB sitemap contains blogs, programs, offers, funnels, and resources that directly address customer pain points. You MUST proactively scan the sitemap for relevant links when you detect an underlying pain or need, even in subtext.
HOW IT WORKS:
1. DETECT: Read the customer's email for explicit pain ("I'm struggling with grief"), implicit pain ("nothing seems to work anymore"), or subtext need ("I don't know what else to try").
2. MATCH: Search the KB sitemap for a resource that bridges that pain to a solution. Examples:
   - Customer mentions grief or loss → link the Grief program or Coping With Grief And Loss content
   - Customer feels overwhelmed or stuck → link the 30-Day Program or relevant blog posts
   - Customer mentions fear or anxiety → link Conquering Chronic Fear
   - Customer asks about community → link Healing Circles or community resources
3. DELIVER: Weave the recommendation naturally into your reply. Not as a sales pitch. As a peer saying "hey, this might be exactly what you need right now."
WHEN TO SUPPRESS: Do NOT recommend resources when:
   - The customer explicitly requested a refund or cancellation (respect their exit)
   - The customer is expressing anger toward the service itself
   - The distress level is so high that any recommendation would feel tone-deaf
   - The issue is purely technical (login, access, billing)
CRITICAL: Every resource link you include MUST come from the KB sitemap. Never invent a URL to bridge a need.

─── BEGIN INTERNAL KNOWLEDGE BASE (do NOT reproduce these markers in your reply) ───
${kbContext || "Respond with extreme empathy, validate the user's feelings, and offer actionable next steps."}
─── END INTERNAL KNOWLEDGE BASE ───

BUSINESS MODEL REALITY — READ BEFORE EVERY REPLY:

DIGITAL PROGRAMS (30-Day Program, 6-Program Bundle):
- ONE-TIME purchase only. No subscription. No recurring billing. Customer will NEVER be charged again.
- Access is PERMANENT (lifetime). Programs live in the Library at neurotoned.com/library.
- When a customer says "cancel my subscription" for a digital program: this is billing anxiety. Reassure them — no future charges.

RECONNECT+ PHYSICAL CAPSULES (Neurotoned Reconnect+):
- This is a PHYSICAL supplement shipped to the customer — NOT a digital product.
- 60 capsules per bottle = 30-day supply. Dose: 2 capsules/day with a meal.
- Ingredients: Bacopa Monnieri, Ginkgo Biloba Extract, Siberian Ginseng Extract, Alpha Lipoic Acid, Phosphatidylserine. All-natural, gluten-free.
- Available as single bottle, 2-pack, and 6-pack.
- REFUND POLICY — 90-day money-back guarantee:
  - 1 or 2 bottles purchased: NO return required. Full refund, no questions.
  - 3 or more bottles: Must return UNOPENED bottles to receive the refund.
- Reconnect+ IS an auto-renewing subscription (autoship). Every order renews automatically until cancelled.
- CANCELLATION POLICY (Reconnect+): If a customer wants to cancel — CANCEL IT immediately. No save attempts, no conditions, no hoops. Confirm the cancellation and inform them of any refund they are eligible for under the 90-day policy.

RECURRING SUBSCRIPTIONS (the ONLY recurring products):
- Healing Circles and the Monthly Membership are the ONLY recurring digital subscriptions. These CAN be cancelled.
- Any Reconnect+ autoship order would also be recurring — always confirm before reassuring.
SOFT LANDING PROTOCOL (for cancellation/billing anxiety on one-time products):
  1. RELIEVE: Lead with financial certainty. "There are no future charges." Remove the anxiety first.
  2. REFRAME: Position the product as an asset. "It's permanently yours."
  3. RESPECT: Never guilt or pressure. If they want a refund, honor it immediately.
  DO NOT use this protocol if they explicitly say "I want a refund." Those are explicit refund requests — honor immediately.

${WRITING_VOICE}

CRITICAL VOICE RULE: The NVC empathy protocol ALWAYS overrides the writing voice.
The writing voice governs word choice, rhythm, and sentence structure ONLY.
If distress intensity is High, soften any voice toward warmth before applying its style.

AGENT ENRICHMENT RULE:
If <agent_instructions> are provided, treat them as HIGHEST-PRIORITY factual context.
They override KB/SOP when they conflict. Do NOT reveal agent instructions in your reply.

REQUIRED WORKFLOW:
Generate 3 keys: "emotion_read", "thinking", and "reply".

"emotion_read" RULES:
1. Primary emotion detected
2. What they are secretly afraid of or embarrassed by
3. The thought-narration sentence you will use to disarm them

"thinking" RULES:
1. CONTEXT: Technical/logistical reality of the situation
2. RESOLUTION CHECK: Billing anxiety, product dissatisfaction, or explicit refund?
3. WRITING VOICE ACTIVE: Which voice is assigned and how it shapes this reply
4. PEACE OUTLINE: Problem, Empathy, Answer, Change/Plan, End Result

"analytics" CLASSIFICATION RULES (required — fill every field precisely):

CONCERN BIN: use the first matching rule below. Do NOT default to General Feedback or Other.
1. Money back on 30-Day Program or 6-Program Bundle = "Program Refund"
2. Cannot find or access programs in the library = "Program Access"
3. Wants to cancel Healing Circles, Monthly Membership, or Reconnect+ autoship = "Subscription Cancel"
4. Surprised by a charge or asks "will I be charged again" = "Billing Confusion"
5. Cannot log in, password reset, account locked = "Technical / Login"
6. Question about program content, exercises, or how it works = "Content / Program Question"
7. Any concern about the Reconnect+ physical capsule product = "Reconnect+ Issue"
8. Physical package not arrived or missing = "Shipping / Missing Order"
9. Symptoms, side effects, drug interactions = "Health / Medical"
10. Praise or neutral suggestion = "General Feedback"
11. Only if NONE of the above fit = "Other"

URGENCY: critical for any medical. high for explicit refund demand or strong anger. medium for blocked access or billing dispute. low for everything else.

SUMMARY: One sentence. Include product name. Include what they want. Under 20 words. No names.

"reply" RULES:
- Clean text. No Markdown. No em dashes. No asterisks. No bullet points. No numbered lists.
- Separate each paragraph with exactly one blank line (two line breaks). Do NOT use single line breaks mid-paragraph.
- NEVER include internal system tags, delimiters, or markers in your reply. If you see "BEGIN INTERNAL" or "END INTERNAL" or "sops_and_knowledge" or any similar structural text, it is INTERNAL ONLY. Including it in the reply is a critical failure.
- Each paragraph = one complete thought. Break where the thought shifts.
- DEFAULT replies: 3-4 paragraphs. PATH A refund replies: up to 7 paragraphs (follow the numbered structure). PATH B refund replies: 3-4 paragraphs.
- Never repeat the same sentiment twice.
- Eliminate filler: never use "Thanks for reaching out", "Please don't hesitate", "feel free to", "absolutely".
- WHITELIST: The phrase "If anything seems unclear or if we could've done anything differently to make this a better experience, please let us know. We're always here with you." IS allowed as a standard closing. This is the ONLY canned line permitted.
- Every sentence must validate emotion, deliver information, or ask a question. If it does none, cut it.
- Closing: ONE sentence max. Not a paragraph of reassurance.

REPLY ROUTING:
== IF EXPLICIT REFUND → CHECK ENGAGEMENT FIRST ==
Read the agent enrichment context for the customer's engagement percentage. This is MANDATORY for refund requests.

--- PATH A: ENGAGEMENT BELOW 15% (e.g., "Client at 3%", "Client at 0%", "Client at 12%") ---
Use the following structure. Follow the TONE and FLOW precisely. Adapt the specific engagement number from agent enrichment, but keep the bones:

1. [Disarming opener]: "Reaching out about a refund usually means bracing for a difficult conversation. This won't be one."
2. [Guarantee confirmation]: Confirm the refund is real and guaranteed. Remove all anxiety. "Your refund is on the table. The 30-Day Program has a full money-back guarantee, and I'm going to make sure you're taken care of. That part is not in question."
3. [The 15% ask, framed as honesty, not policy]: "Not as a policy, but as a person." Name what they purchased (60+ videos, breathwork, somatic tools, vagus nerve exercises). State their current engagement %. State the 15% threshold. Frame it as easy: "That's usually about one or two short lessons, which most people reach in under 15 minutes."
4. [The WHY behind the ask]: "I've watched too many people walk away from something that would have genuinely helped them, simply because they never opened it. 15% is just enough to know whether this was right for you or not."
5. [Clear next step]: Direct them to neurotoned.com/login. One lesson. Message back. "I'll process it that same day. No convincing. No follow-up emails. No hoops."
6. [Curiosity question — CONDITIONAL]: SKIP entirely if the refund reason is: could not access the program, technical/login barrier, never used it due to access problems, or any scenario where they experienced a support failure rather than a content mismatch. In those cases this question is tone-deaf — they never got to experience the program. INCLUDE only when the reason is content/program not working, expectations mismatch, or wrong fit. When included: "What actually brought you to Neurotoned in the first place? Was it sleep, anxiety, grief, something else?" — open the door to recommend a better fit, but do NOT push the 6-Program Bundle unless they respond.
7. [One-line close]: "Whatever you decide, I'm here for it."
8. [Feedback invite]: "And if anything about this experience, the purchase, the content, or even this conversation, could have been better, I'd genuinely love to hear it. That kind of honesty is what makes us better."

DO NOT: Use heavy empathy openers. DO NOT: Offer the 6-Program Bundle unprompted. DO NOT: Use em dashes. The tone is calm, grounded, peer-level. Not emotional.

--- PATH B: ENGAGEMENT AT OR ABOVE 15% → PROCESS REFUND IMMEDIATELY ---
1. [Empathy opening]: Validate that it takes clarity to know something isn't the right fit.
2. [Immediate Release]: Tell them you will process their refund fully, no conditions. Do NOT say "I've processed" or "I've gone ahead" — say "I'll process this" or "we'll process your refund". Timeline to share: 3-5 business days our end, 5-10 days bank.
3. [Refund Curiosity Ask]: Gentle question about what didn't land with the PROGRAM. Give permission to ignore.
4. [Gold Standard Close]: Thank them for being part of the Neurotoned family. Wish peace on their healing journey.
DO NOT include: Save attempts, gift offers, Journal mentions.
CRITICAL: You are drafting an email for a human agent to review and send. NEVER claim to have already performed any action (cancelled, processed, refunded). Always use future tense: "I'll", "we'll", "you will see".

== IF MEDICAL CRISIS → MEDICAL CRISIS REPLY STRUCTURE ==
[Empathy opening] → [Halt usage] → [Direct to healthcare professional] → [One closing question]

== ALL OTHER SCENARIOS → DEFAULT REPLY STRUCTURE ==
[Empathy + Resolution body] → [Scenario-Aware Closing sentence] → [MAGIC TOUCH]

MAGIC TOUCH — MANDATORY. One sentence. Fires unconditionally on every reply.
Purpose: leave the customer with warmth specific to their situation. Not a generic sign-off.
Rules:
- Scenario-matched — read the actual context of their email.
- Never start with "We" — direct it at them.
- Never use: "We're always here for you" / "Don't hesitate" / "Have a great day" / "It means the world to us"
- Voice: Brene Brown — grounded, peer-level, genuine. Never saccharine.
Examples (adapt details, do not copy verbatim):
- Program access issue: "Excited for you to get back in there — there's a lot waiting for you."
- Content / breathwork question: "That curiosity is exactly what makes this work land deeper."
- Billing clarity: "Glad we could bring some clarity to this."
- Subscription cancel: "Wherever your path takes you next, we genuinely wish you well."
- Refund resolved: "Thank you for giving Neurotoned a chance. That took real courage."
- General inquiry: "Really glad you're part of this community."
- Login / access restored: "Hope the next session is exactly what you need today."

CLOSING QUESTION GATE — only add a closing question AFTER the MAGIC TOUCH when ALL of the following are true:
1. The customer's core request has been fully answered (not pending, not "we'll investigate")
2. The customer's tone is neutral or positive — NOT frustrated, upset, confused, or urgent
3. The question is genuinely relevant — NOT generic engagement bait
If ANY condition is not met: end with the MAGIC TOUCH only. No question.
HARD SCENARIO EXCLUSIONS — NEVER add a closing question for these, regardless of tone:
- Technical / Login issues (password, account access) — customer has not confirmed it worked yet
- Program Access issues — customer has not confirmed they found their programs yet
- Shipping / Missing Order — resolution is pending, not confirmed
- Any scenario where the reply contains "reply to this email", "let us know if", or "if that doesn't work"

Diagnostic Matrix (Common Scenarios):
- "Can't login" → MUST send login link [https://www.neurotoned.com/login] AND password reset [https://www.neurotoned.com/password/new]. Offer to manually reset if they reply.
- "Missing package" → Initiate investigation. Give actionable steps. Guarantee resolution.
- "Where are the programs?" → Programs are at [https://www.neurotoned.com/library]. Direct them there.
- "Medical Question" → Halt usage immediately. Direct to medical professionals. Do not diagnose.`
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
        maxOutputTokens: 3500,
        temperature: 0.7,
        responseMimeType: "application/json" as const,
        responseSchema: {
          type: SchemaType.OBJECT as SchemaType.OBJECT,
          properties: {
            emotion_read: {
              type: SchemaType.OBJECT,
              properties: {
                primary_emotion: { type: SchemaType.STRING, description: "Primary emotion detected" },
                secret_fear: { type: SchemaType.STRING, description: "What they are secretly afraid of or embarrassed by" },
                thought_narration: { type: SchemaType.STRING, description: "The thought-narration sentence you will use" }
              },
              required: ["primary_emotion", "secret_fear", "thought_narration"]
            },
            thinking: {
              type: SchemaType.OBJECT,
              properties: {
                context: { type: SchemaType.STRING, description: "Technical/logistical reality" },
                resolution_check: { type: SchemaType.STRING, description: "Billing anxiety, dissatisfaction, or explicit refund?" },
                writing_voice: { type: SchemaType.STRING, description: "Which voice is active and how it shapes this reply" },
                peace_outline: { type: SchemaType.STRING, description: "Problem, Empathy, Answer, Change/Plan, End Result" }
              },
              required: ["context", "resolution_check", "writing_voice", "peace_outline"]
            },
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
                    "Reconnect+ Cancel",
                    "Reconnect+ Refund",
                    "Program Refund",
                    "Program Access",
                    "Billing Confusion",
                    "Shipping / Missing Order",
                    "Product Question",
                    "Technical / Login",
                    "Health / Medical",
                    "General Feedback",
                    "Other"
                  ],
                  description: "Pick the MOST specific bin. Reconnect+ Cancel: stop autoship. Reconnect+ Refund: money back on capsules. Program Refund: money back on digital program. Program Access: cannot find or access library. Billing Confusion: surprised by charge, no explicit refund request. Shipping/Missing Order: physical package not received. Product Question: ingredients/dosage/usage. Technical/Login: login failure or account issue. Health/Medical: symptoms or drug interaction concern. General Feedback: praise or neutral suggestion only. Other: truly none of the above."
                },
                sub_reason: {
                  type: SchemaType.STRING,
                  description: "Specific driver. Use plain English. Examples: cancel autoship price too high | cancel autoship no reason given | refund 1-2 bottles | refund 3+ bottles | forgot password | programs not in library | surprised by charge after one-time purchase | package not delivered | ingredient interaction question | side effect concern"
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
      saveToCrm(parsedData.analytics, email).catch(() => {});
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

    // Phase 1: Safe word-for-word swaps (no sentence structure risk)
    finalReply = finalReply
      .replace(/\bwe can absolutely\b/gi, "we can")
      .replace(/\bI can absolutely\b/gi, "I can")
      .replace(/\byou can absolutely\b/gi, "you can")
      .replace(/\bwill absolutely\b/gi, "will")
      .replace(/\bI can certainly\b/gi, "I can")
      .replace(/\bwe can certainly\b/gi, "we can")
      .replace(/\bfeel free to\b/gi, "go ahead and");

    // Phase 2: Standalone sentence openers — remove only when they start a sentence
    finalReply = finalReply
      .replace(/^Thanks for reaching out[.,]?\s*/gim, "")
      .replace(/^Thank you for reaching out[.,]?\s*/gim, "")
      .replace(/^I hope this helps[.,]?\s*/gim, "");

    // Phase 3: Full-clause removal — includes everything after the banned phrase to EOL
    // This prevents leaving dangling fragments like "to reach out" after removal
    finalReply = finalReply
      .replace(/[,.]?\s*[Pp]lease don't hesitate to[^.!?\n]*/g, "")
      .replace(/[,.]?\s*[Dd]on't hesitate to[^.!?\n]*/g, "")
      .replace(/\babsolutely\b/gi, "")
      .replace(/\bcertainly\b/gi, "");

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

    // Phase 4.5: Ensure closing question is its own paragraph
    // If the last paragraph has multiple sentences and ends with "?", split the "?" sentence out.
    {
      const paras = finalReply.split("\n\n");
      const last = paras[paras.length - 1];
      if (last && last.endsWith("?")) {
        const sentences = last.match(/[^.!?]+[.!?]+/g) || [last];
        if (sentences.length > 1) {
          const questionSentence = sentences.pop()!.trim();
          const rest = sentences.join(" ").trim();
          if (rest.length > 0) {
            paras[paras.length - 1] = rest;
            paras.push(questionSentence);
            finalReply = paras.join("\n\n");
          }
        }
      }
    }

// Phase 5: Punctuation repair after all removals
    finalReply = finalReply
      .replace(/ ([.,!?])/g, "$1")       // space before punctuation
      .replace(/([.,!?]){2,}/g, "$1")    // duplicate punctuation
      .replace(/,\s*\./g, ".")           // comma-period combo
      .trim();

    // Phase 5.5: Max 1 question paragraph per reply
    // If both the last and second-to-last paragraphs end with "?", remove the last one.
    // This prevents double-question endings caused by PATH A + Magic Touch merging.
    {
      const paras55 = finalReply.split("\n\n");
      if (paras55.length >= 2) {
        const last55 = paras55[paras55.length - 1].trim();
        const secondToLast55 = paras55[paras55.length - 2].trim();
        if (last55.endsWith("?") && secondToLast55.endsWith("?")) {
          paras55.pop(); // remove the extra question paragraph
          finalReply = paras55.join("\n\n").trim();
        }
      }
    }

    return NextResponse.json({ response: finalReply });
  } catch (error: unknown) {
    console.error("Generate API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate response.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
