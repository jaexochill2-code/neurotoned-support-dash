import { NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, SchemaType } from "@google/generative-ai";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getKbContext } from "@/lib/kb-cache";
import { cookies } from "next/headers";

const MAX_EMAIL_LENGTH = 10_000;

// ── Module-level Gemini client (reused across warm invocations) ──────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ── Analytics: Fire-and-forget save to CRM ──────────────────────────────────
const VALID_BINS = ["Refund", "Cancellation", "Product Fit", "Marketing", "Access / Login", "UX / App", "General"];

async function saveToCrm(analytics: Record<string, string>, rawEmail: string) {
  try {
    const rawBin = analytics.concern_bin || "General";
    const category = VALID_BINS.includes(rawBin) ? rawBin : "General";
    const severityMap: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };
    const severity = severityMap[analytics.intensity?.toLowerCase()] ?? "Medium";

    await supabaseAdmin.from("customer_concerns").insert({
      customer_name: analytics.customer_name ?? "Anonymous",
      customer_email_address: analytics.customer_email ?? "unknown@unknown.com",
      concern_category: category,
      sub_reason: analytics.sub_reason ?? "other",
      concern_summary: analytics.summary,
      severity_distress_level: severity,
      raw_customer_email: rawEmail,
      status: "Pending",
    });
  } catch (err) {
    console.error("CRM save failed (non-fatal):", err);
  }
}

// ── Voice Persona Cycling ───────────────────────────────────────────────────
const VOICE_PERSONAS = ["rogers", "brene", "mel", "esther", "glennon"] as const;
type VoicePersona = (typeof VOICE_PERSONAS)[number];
let personaIndex: number = Math.floor(Date.now() / 1000) % VOICE_PERSONAS.length;

function getNextPersona(): VoicePersona {
  const persona = VOICE_PERSONAS[personaIndex % VOICE_PERSONAS.length];
  personaIndex++;
  return persona;
}

const PERSONA_INSTRUCTIONS: Record<VoicePersona, string> = {
  rogers:
`─── YOUR WRITING VOICE: Fred Rogers (The Slow Witness) ───
Be unhurried. This customer is the only person in the room right now.
Acknowledge feelings before the problem. Never rush to the solution.
Make them feel completely safe to be exactly where they are.
Conversational, warm, medium-short sentences. Reflect their own feeling word back gently if appropriate.
Ideal for high-distress, shame, or quietly defeated customers.`,

  brene:
`─── YOUR WRITING VOICE: Brené Brown (The Courage Whisperer) ───
Lead with vulnerability. Name the hard thing out loud so they don't have to.
De-shame everything. "There is nothing wrong with you for feeling this way."
Peer-level warmth. You are walking beside them, not above them.
Medium sentences. Grounded, never flowery. Courage over comfort, but always kind.`,

  mel:
`─── YOUR WRITING VOICE: Mel Robbins (The Warm Activator) ───
Direct, friendly, zero fluff. "Here's what we're going to do."
Validate fast, then move into action. Make them feel like they have a friend who actually gets things done.
Short, punchy sentences. Conversational contractions. Energy without hype.
Never cold, never preachy. The warmth lives in the confidence.`,

  esther:
`─── YOUR WRITING VOICE: Esther Perel (The Emotional Translator) ───
Read the subtext. Name what they haven't said yet.
Emotionally intelligent, curious, never judgmental. Ask the question they didn't know they needed to hear.
Medium-length sentences with a gentle rhythm. Let pauses do work.
Perfect for complicated feelings: ambivalence about cancelling, guilt about refunding, uncertainty about whether something is "working."`,

  glennon:
`─── YOUR WRITING VOICE: Glennon Doyle (The Raw Truth-Teller) ───
Honest, no pretense, no performance. "We can do hard things" energy.
Make them feel brave for reaching out. Reaching out IS the brave thing.
Short-to-medium sentences. Conversational, grounded, real.
Never poetic, never flowery. The warmth lives in the rawness and the realness.`,
};


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
    const currentPersona = getNextPersona();
    const personaInstruction = PERSONA_INSTRUCTIONS[currentPersona];

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

BUSINESS MODEL REALITY (Neurotoned Programs):
- The 30-Day Program and 6-Program Bundle are ONE-TIME purchases. No recurring billing. Customer will never be charged again.
- Access is PERMANENT (lifetime). Programs remain in Library forever.
- Healing Circles and the Monthly Subscription are the ONLY recurring products. These CAN be cancelled.
- When a customer says "cancel my subscription" for a one-time program, they are expressing billing anxiety, not requesting account deletion.

SOFT LANDING PROTOCOL (for cancellation/billing anxiety on one-time products):
  1. RELIEVE: Lead with financial certainty. "There are no future charges." Remove the anxiety first.
  2. REFRAME: Position the product as an asset. "It's permanently yours."
  3. RESPECT: Never guilt or pressure. If they want a refund, honor it immediately.
  DO NOT use this protocol if they explicitly say "I want a refund." Those are explicit refund requests — honor immediately.

${personaInstruction}

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

"reply" RULES:
- Clean text. No Markdown. No em dashes. No bullet lists.
- NEVER include internal system tags, delimiters, or markers in your reply. If you see "BEGIN INTERNAL" or "END INTERNAL" or "sops_and_knowledge" or any similar structural text, it is INTERNAL ONLY. Including it in the reply is a critical failure.
- Break paragraphs up so it breathes. Max 4 paragraphs.
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
6. [Curiosity question]: "What actually brought you to Neurotoned in the first place? Was it sleep, anxiety, grief, something else?" Open the door to recommend a better fit, but do NOT push the 6-Program Bundle unless they respond.
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
[Empathy + Resolution body] → [Gentle Feedback Invite woven naturally] → [Scenario-Aware Closing sentence] → [Closing question]

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
        maxOutputTokens: 2000,
        temperature: 0.8,
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
              description: "The final email to the customer. Clean text, no markdown, no em dashes. Max 4 paragraphs."
            },
            analytics: {
              type: SchemaType.OBJECT,
              properties: {
                concern_bin: {
                  type: SchemaType.STRING,
                  format: "enum",
                  enum: ["Refund", "Cancellation", "Product Fit", "Marketing", "Access / Login", "UX / App", "General"]
                },
                sub_reason: { type: SchemaType.STRING },
                sentiment: { type: SchemaType.STRING, format: "enum", enum: ["positive", "neutral", "negative"] },
                intensity: { type: SchemaType.STRING, format: "enum", enum: ["low", "medium", "high"] },
                summary: { type: SchemaType.STRING, description: "Max 15 words, no names or personal details" },
                customer_name: { type: SchemaType.STRING },
                customer_email: { type: SchemaType.STRING }
              },
              required: ["concern_bin", "sub_reason", "sentiment", "intensity", "summary", "customer_name", "customer_email"]
            }
          },
          required: ["emotion_read", "thinking", "reply", "analytics"]
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

    return NextResponse.json({ response: finalReply });
  } catch (error: unknown) {
    console.error("Generate API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate response.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
