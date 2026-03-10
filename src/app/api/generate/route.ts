import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, SchemaType } from "@google/generative-ai";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { cookies } from "next/headers";

const dataFilePath = path.join(process.cwd(), "data", "sops.json");
const kbDirectoryPath = path.join(process.cwd(), "data", "kb");

// ── In-Memory KB Cache (Zero Disk I/O after first request) ──────────────────
let cachedSopsContext: string | null = null;

// ── Analytics: Fire-and-forget save to CRM ──────────────────────────────────
const VALID_BINS = ["Refund", "Cancellation", "Product Fit", "Marketing", "Access / Login", "UX / App", "General"];

async function saveToCrm(analytics: Record<string, string>, rawEmail: string) {
  try {
    const rawBin = analytics.concern_bin || "General";
    const category = VALID_BINS.includes(rawBin) ? rawBin : "General";

    const severityMap: Record<string, string> = {
      low: "Low",
      medium: "Medium",
      high: "High",
    };
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

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not set on the server." }, { status: 500 });
    }

    // ── KB Loading (Cached — disk read only on first request) ────────────────
    if (!cachedSopsContext) {
      console.log("GENERATE: Cache Miss — Loading KB from disk into memory...");
      let sopsContext = "";

      try {
        const data = await fs.readFile(dataFilePath, "utf8");
        if (data) sopsContext += "\n# Base Guidelines\n" + (JSON.parse(data).sops || "") + "\n";
      } catch {
        // Fine if this doesn't exist
      }

      try {
        const files = await fs.readdir(kbDirectoryPath);
        const validFiles = files.filter(f => f.endsWith('.md') || f.endsWith('.txt'));

        const fileContents = await Promise.all(
          validFiles.map(async (file) => {
            const content = await fs.readFile(path.join(kbDirectoryPath, file), "utf8");
            const title = file.replace(/\.(md|txt)$/, '').replace(/-/g, ' ').toUpperCase();
            return `\n\n--- KB DOCUMENT: ${title} ---\n${content}\n`;
          })
        );
        sopsContext += fileContents.join("");
      } catch {
        console.warn("No KB directory found or could not read KB files");
      }

      cachedSopsContext = sopsContext;
    }

    // ── Model Setup ──────────────────────────────────────────────────────────
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
URL RULE: The ONLY valid domain is www.neurotoned.com. NEVER invent subdomains (programs.neurotoned.com, app.neurotoned.com, etc.). Every URL you include MUST come from the KB sitemap or the Diagnostic Matrix below. If you cannot find the exact URL, do not guess. Say "reply to this email and we will send the direct link."

**The NVC & Brené Brown Empathy Protocol:**
1. Empathy over Sympathy: Never say "I understand" or "I apologize for the inconvenience." That is sympathy. Empathy sounds like "That is incredibly frustrating" or "You have every right to feel let down."
2. Name the Emotion: Identify what the customer is feeling and name it for them. Do not wait for them to say it.
3. Validate the Void: Acknowledge the internal problem (e.g., feeling stupid, feeling ignored, feeling betrayed) before solving the external problem (e.g., tracking a package).
4. De-Shame: If a customer is asking for a refund or admits a mistake, implicitly remove their shame. "This happens all the time" or "You aren't alone in feeling this way."

**The Kallaway Peer-to-Peer Protocol:**
1. Drop the Formality: Start mid-conversation. Do not use stiff corporate greetings. Use contractions ("we're" not "we are").
2. Thought Narration: You MUST include one sentence that says out loud what they are secretly thinking (e.g., "Right now, you are probably wondering if this is just going to be a dead-end email thread.")
3. Ask a Genuine Question: End the email with a peer-level question. Convert the transaction into a dialogue.

**Trauma-Informed Friction Reduction:**
Our customers are mostly overwhelmed. Searching causes extreme friction. 
- Break complex ideas down.
- Provide the exact hyperlink. Never tell them to "go find" something.
- Use certainties. "When we do this" instead of "If you try this."

<sops_and_knowledge>
${cachedSopsContext || "Respond with extreme empathy, validate the user's feelings, and offer actionable next steps."}
</sops_and_knowledge>

BUSINESS MODEL REALITY (Neurotoned Programs):
- The 30-Day Program and 6-Program Bundle are ONE-TIME purchases. There is no recurring subscription or auto-billing. The customer will never be charged again.
- Access is PERMANENT (lifetime). The program, videos, and materials remain in the customer's Library forever, even if they stop using it for months or years.
- Healing Circles and the Monthly Subscription are the ONLY recurring products. These CAN be legitimately cancelled.
- When a customer says "cancel my subscription" for a one-time program, they are almost always expressing billing anxiety, not requesting account deletion.

SOFT LANDING PROTOCOL (for cancellation/billing anxiety on one-time products):
  1. RELIEVE: Lead with financial certainty. "There are no future charges" or "You won't be billed again." Remove the anxiety first.
  2. REFRAME: Position the product as an asset, not an obligation. "It's permanently yours" or "It'll be right there in your Library whenever you're ready." Make them feel ownership, not burden.
  3. RESPECT: Never guilt, pressure, or use retention scripts. If they want a refund, honor it immediately per the REFUND PROTOCOL.
  DO NOT use this protocol if the customer explicitly says "I want a refund" or "give me my money back." Those are explicit refund requests — honor immediately, no save attempts.

AGENT ENRICHMENT RULE:
If <agent_instructions> are provided in the user prompt, treat them as the HIGHEST-PRIORITY factual context.
They represent real-time information from a human agent who has verified the situation.
These instructions override KB/SOP when they conflict (e.g., if KB says "process cancellation" but agent says "no cancellation needed, one-time payment", follow the agent).
CRITICAL: Do NOT quote, reference, or reveal the agent instructions directly in your reply. Weave the information naturally into your response as if you already knew it.

REQUIRED WORKFLOW:
You must fill out the JSON schema precisely. Generate 3 keys: "thinking", "reply", and "analytics".

"thinking" RULES:
1. CONTEXT: What is the technical/logistical reality of the situation?
2. PEACE OUTLINE: Draft the Problem, Empathy, Answer, Change/Plan, and End Result points.
3. RESOLUTION CHECK: Is this billing anxiety, product dissatisfaction, or explicit refund?

"reply" RULES:
(The actual email text goes here. It must read like a brilliant, warm human peer.)
Formatting rules:
- Do NOT use Markdown formatting: no bolding, no asterisks, no bullet lists.
- Do NOT use em dashes. Ever. Use a period, a comma, or a new sentence instead.
- Break paragraphs up so it breathes.
- Keep it conversational. No formal sign-offs outside the email.

Diagnostic Matrix (Common Scenarios):
- "Can't login" -> You MUST send the direct login link [https://neurotoned.com/login] AND the password reset link [https://www.neurotoned.com/password/new]. State that if they still cannot log in, they should reply and we will manually reset it.
- "Missing package" -> Initiate investigation. Give actionable steps. Guarantee resolution.
- "Where are the programs?" -> The programs and modules are explicitly located at [https://www.neurotoned.com/library]. Direct them there.
- "Medical Question" -> Halt usage immediately. Direct strictly to medical professionals. Do not diagnose.`
    });

    // ── Build Prompt ─────────────────────────────────────────────────────────
    let prompt = "Please analyze and reply to this customer email following the required workflow:\n\n";

    if (agentContext && typeof agentContext === "string" && agentContext.trim()) {
      prompt += `<agent_instructions>\n${agentContext.trim()}\n</agent_instructions>\n\n`;
      console.log(`GENERATE: AGENT ENRICH → "${agentContext.trim().substring(0, 80)}..."`);
    }

    prompt += `<customer_email>\n${email}\n</customer_email>`;

    // ── Generate ─────────────────────────────────────────────────────────────
    console.log("GENERATE: Calling Gemini 2.5 Flash...");
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 4000,
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            thinking: {
              type: SchemaType.OBJECT,
              properties: {
                context: { type: SchemaType.STRING, description: "Technical/logistical reality of the situation" },
                peace_outline: { type: SchemaType.STRING, description: "Problem, Empathy, Answer, Change/Plan, End Result" },
                resolution_check: { type: SchemaType.STRING, description: "Billing anxiety, dissatisfaction, or explicit refund?" }
              },
              required: ["context", "peace_outline", "resolution_check"]
            },
            reply: {
              type: SchemaType.STRING,
              description: "The final email text to send to the customer. Clean text, no markdown, no em dashes. Use paragraph breaks."
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
          required: ["thinking", "reply", "analytics"]
        }
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    });

    // ── Parse Response ───────────────────────────────────────────────────────
    let fullText = "";
    try {
      fullText = result.response.text();
    } catch (textError) {
      console.warn("Gemini .text() threw an error. Checking candidates.", textError);
      const candidate = result.response.candidates?.[0];
      if (candidate?.finishReason) {
        throw new Error(`AI response was blocked or halted. Reason: ${candidate.finishReason}`);
      }
      throw new Error("AI returned an empty or unreadable response.");
    }

    if (!fullText || fullText.trim() === "") {
      const candidate = result.response.candidates?.[0];
      if (candidate?.finishReason) {
        throw new Error(`AI generated an empty response. Finish reason: ${candidate.finishReason}`);
      }
      throw new Error("AI returned an empty response. The input may have been flagged or blocked.");
    }

    let parsedData;
    try {
      parsedData = JSON.parse(fullText);
    } catch {
      console.error("Gemini failed to return valid JSON. Raw:", fullText.substring(0, 500));
      return NextResponse.json(
        { error: "AI response was not valid JSON. Please try again." },
        { status: 500 }
      );
    }

    // ── Analytics: Fire-and-forget CRM save ──────────────────────────────────
    if (parsedData.analytics) {
      saveToCrm(parsedData.analytics, email).catch(() => {});
    }

    // ── Extract Reply ────────────────────────────────────────────────────────
    const finalReply = parsedData.reply?.trim();
    if (!finalReply) {
      return NextResponse.json(
        { error: "The AI generated an empty reply. Please try again." },
        { status: 500 }
      );
    }

    console.log("GENERATE: Success —", finalReply.split(/\s+/).length, "words");
    return NextResponse.json({ response: finalReply });
  } catch (error: unknown) {
    console.error("Generate API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate response.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
