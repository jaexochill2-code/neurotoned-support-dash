import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { supabaseAdmin } from "@/lib/supabase-admin";

const dataFilePath = path.join(process.cwd(), "data", "sops.json");
const kbDirectoryPath = path.join(process.cwd(), "data", "kb");

// ── Analytics: Parse the <analytics> XML block Gemini returns ─────
function parseAnalytics(raw: string) {
  const get = (key: string) =>
    raw.match(new RegExp(`${key}:\\s*(.+)`))?.[1]?.trim() ?? "unknown";
  return {
    sentiment:      get("sentiment"),
    intensity:      get("intensity"),
    concern_bin:    get("concern_bin"),
    churn_reason:   get("churn_reason"),   // legacy fallback
    sub_reason:     get("sub_reason"),
    summary:        get("summary"),
    customer_name:  get("customer_name"),
    customer_email: get("customer_email"),
  };
}

// ── Analytics: Fire-and-forget save to CRM ───────────────
const VALID_BINS = ["Refund", "Cancellation", "Product Fit", "Marketing", "Access / Login", "UX / App", "General"];

async function saveToCrm(data: ReturnType<typeof parseAnalytics>, rawEmail: string) {
  try {
    // Gemini now emits the exact Tier 1 label via concern_bin.
    // Fall back to churn_reason for any legacy data, then default to General.
    const rawBin = data.concern_bin !== "unknown" ? data.concern_bin : data.churn_reason;
    const category = VALID_BINS.includes(rawBin) ? rawBin : "General";

    const severityMap: Record<string, string> = {
      low: "Low",
      medium: "Medium",
      high: "High",
    };
    const severity = severityMap[data.intensity?.toLowerCase()] ?? "Medium";

    await supabaseAdmin.from("customer_concerns").insert({
      customer_name: data.customer_name ?? "Anonymous",
      customer_email_address: data.customer_email ?? "unknown@unknown.com",
      concern_category: category,
      sub_reason: data.sub_reason ?? "other",
      concern_summary: data.summary,
      severity_distress_level: severity,
      raw_customer_email: rawEmail,
      status: "Pending",
    });
  } catch (err) {
    console.error("CRM save failed (non-fatal):", err);
  }
}

import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("neurotoned_admin_token")?.value;
    if (token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { email } = await req.json();

    console.log("TRACE: 1. Request received");
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Valid email text is required." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not set on the server." }, { status: 500 });
    }

    let sopsContext = "";

    // 1. Read legacy SOPs (if they still exist)
    try {
      const data = await fs.readFile(dataFilePath, "utf8");
      if (data) sopsContext += "\n# Base Guidelines\n" + (JSON.parse(data).sops || "") + "\n";
    } catch {
      // Fine if this doesn't exist
    }

    // 2. Read Knowledge Base files
    try {
      const files = await fs.readdir(kbDirectoryPath);
      for (const file of files) {
        if (file.endsWith('.md') || file.endsWith('.txt')) {
          const content = await fs.readFile(path.join(kbDirectoryPath, file), "utf8");
          const title = file.replace(/\.(md|txt)$/, '').replace(/-/g, ' ').toUpperCase();
          sopsContext += `\n\n--- KB DOCUMENT: ${title} ---\n${content}\n`;
        }
      }
    } catch (e) {
      console.warn("No KB directory found or could not read KB files");
    }

    console.log("TRACE: 2. KBs merged");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // ─────────────────────────────────────────────────────────────────
    // SINGLE PASS: Proactive Reasoning + Generation via XML Tags using Gemini
    // ─────────────────────────────────────────────────────────────────
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `You are an elite, deeply empathetic, trauma-informed customer support guide for Neurotoned.
You write calming, human-centered, fiercely supportive replies. Never sound like a generic AI or a standard Zendesk macro.

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
${sopsContext || "Respond with extreme empathy, validate the user's feelings, and offer actionable next steps."}
</sops_and_knowledge>

REQUIRED WORKFLOW:
You must ALWAYS respond in EXACTLY this format, using these XML tags.

<emotion_read>
1. Primary emotion detected (e.g., shame, fear, frustration, betrayal):
2. What they are secretly afraid of or embarrassed by:
3. The specific thought-narration sentence you will use to disarm them:
</emotion_read>

<thinking>
1. CONTEXT: What is the technical/logistical reality of the situation?
2. PEACE OUTLINE: Draft the Problem, Empathy, Answer, Change/Plan, and End Result points here.
</thinking>

<reply>
(The actual email text goes here. It must read like a brilliant, warm human peer.
Formatting rules:
- Do NOT use Markdown formatting: no bolding, no asterisks, no bullet lists.
- Do NOT use em dashes. Ever. Use a period, a comma, or a new sentence instead.
- Break paragraphs up so it breathes.
- Keep it conversational. No formal sign-offs outside the email.)
</reply>

<analytics>
concern_bin: (EXACTLY one of: Refund | Cancellation | Product Fit | Marketing | Access / Login | UX / App | General)
sub_reason: (Choose the MOST specific sub-reason from the bin's list below. If none fit, use "other".)
  Refund sub-reasons: guarantee_honor | denied_past_30_days | unrecognized_charge | not_the_right_fit | not_for_her | misleading_upsell | financial_hardship
  Cancellation sub-reasons: cancellation_request | cancelled_subscription | billing_confusion | too_expensive | switching_competitor
  Product Fit sub-reasons: program_didnt_align | too_overwhelming | too_disorganized | too_time_consuming | not_going_to_work | not_nd_friendly
  Marketing sub-reasons: misleading_upsell | manipulative_marketing | price_mismatch | no_questions_asked_mismatch | patronizing_tone
  Access / Login sub-reasons: cant_login | password_issue | didnt_receive_email | delayed_response | forgot_password | wrong_email
  UX / App sub-reasons: not_nd_friendly | patronizing_tone | not_intuitive | app_not_intuitive | ui_bug | app_crashing
  General sub-reasons: feature_request | general_question | positive_feedback | medical_concern | other
sentiment: (positive | neutral | negative)
intensity: (low | medium | high)
summary: (one sentence, max 15 words, NO names or personal details)
customer_name: (extract from email if present, else write Anonymous)
customer_email: (extract email address if present, else write unknown@unknown.com)
</analytics>

Diagnostic Matrix (Common Scenarios):
- "Can't login" -> You MUST send the direct login link [https://neurotoned.com/login] AND the password reset link [https://www.neurotoned.com/password/new]. State that if they still cannot log in, they should reply and we will manually reset it.
- "Missing package" -> Initiate investigation. Give actionable steps. Guarantee resolution.
- "Where are the programs?" -> The programs and modules are explicitly located at [https://www.neurotoned.com/library]. Direct them there.
- "Medical Question" -> Halt usage immediately. Direct strictly to medical professionals. Do not diagnose.`
    });

    const prompt = `Please analyze and reply to this customer email following the required workflow:\n\n<customer_email>\n${email}\n</customer_email>`;

    console.log("TRACE: 3. Model initialized, generating content...");
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 2500,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ]
    });

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

    console.log("TRACE: 4. Generation complete");

    console.log("----- RAW GEMINI TEXT -----");
    console.log(fullText);
    console.log("---------------------------");

    if (!fullText || fullText.trim() === "") {
      const candidate = result.response.candidates?.[0];
      if (candidate?.finishReason) {
         throw new Error(`AI generated an empty response. Finish reason: ${candidate.finishReason}`);
      }
      throw new Error("AI returned an empty response. The input may have been flagged or blocked.");
    }

    // ── STEP 0: Extract analytics BEFORE stripping (fire-and-forget) ─────────
    const analyticsMatch = fullText.match(/<analytics>([\s\S]*?)<\/analytics>/i);
    if (analyticsMatch?.[1]) {
      const parsed = parseAnalytics(analyticsMatch[1]);
      saveToCrm(parsed, email).catch(() => {});
    }

    // ── STEP 1: Strip closed tag blocks ─────────────────────────────────────
    // Use specific closing tags (NOT |$ fallback) to avoid swallowing the <reply>
    let finalReply = fullText.replace(/<emotion_read>[\s\S]*?<\/emotion_read>/gi, "");
    finalReply = finalReply.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");
    finalReply = finalReply.replace(/<analytics>[\s\S]*?<\/analytics>/gi, "");

    // ── STEP 2: Strip any UNCLOSED tag openings (token-limit cutoff safety) ──
    // [^<]* matches until the next tag opener, not greedily to end-of-string
    console.log("TRACE: 5. Stripping UNCLOSED XML");
    finalReply = finalReply.replace(/<emotion_read>[^<]*/gi, "");
    finalReply = finalReply.replace(/<thinking>[^<]*/gi, "");
    finalReply = finalReply.replace(/<analytics>[^<]*/gi, "");

    console.log("TRACE: 6. Extracting reply block");
    // ── STEP 3: Extract the <reply> block if present ──────────────────────────
    const replyMatch = finalReply.match(/<reply>([\s\S]*?)(?:<\/reply>|$)/i);
    if (replyMatch && replyMatch[1]) {
      finalReply = replyMatch[1];
    }

    // ── STEP 4: Final cleanup ─────────────────────────────────────────────────
    finalReply = finalReply.replace(/<\/?reply>/gi, "");
    finalReply = finalReply.replace(/```(?:xml|html)?/gi, "");
    finalReply = finalReply.trim();

    console.log("TRACE: 7. Final text cleanup complete");
    // ── STEP 5: Empty-reply guard ─────────────────────────────────────────────
    // If after all parsing the reply is empty, return a clean error
    // rather than a blank text field showing to the user.
    if (!finalReply || finalReply.length === 0) {
      return NextResponse.json(
        { error: "The AI generated an empty reply. Please try again or rephrase the input." },
        { status: 500 }
      );
    }

    return NextResponse.json({ response: finalReply });
  } catch (error: unknown) {
    console.error("Generate API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate response.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
