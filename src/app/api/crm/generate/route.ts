import { NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Concern ID is required." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not set." }, { status: 500 });
    }

    // 1. Fetch raw email from the concern
    const { data: concern, error: concernError } = await supabaseAdmin
      .from("customer_concerns")
      .select("raw_customer_email, customer_name, concern_category, severity_distress_level")
      .eq("id", id)
      .single();

    if (concernError || !concern) {
      return NextResponse.json({ error: "Failed to fetch concern details." }, { status: 404 });
    }

    const email = concern.raw_customer_email;

    // 2. Fetch the Neurotoned Trauma-Informed SOPs
    let sopsContext = "";
    try {
      const { data: settings } = await supabaseAdmin
        .from("crm_settings")
        .select("value")
        .eq("key", "neurotoned_sops")
        .single();
      if (settings?.value) sopsContext = settings.value;
    } catch (e) {
      console.warn("Could not fetch SOPs from Supabase");
    }

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

**Trauma-Informed Friction Reduction:**
Our customers are mostly overwhelmed. Searching causes extreme friction. 
- Break complex ideas down.
- Provide exact hyperlinks. Never tell them to "go find" something.
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
(The actual email text goes here. It must read like a brilliant, warm human peer. Format clearly with blank lines. Do NOT use markdown. Address the customer by name if known: ${concern.customer_name})
</reply>
`
    });

    const prompt = `Please draft a trauma-informed response to the following customer email.\nCategory: ${concern.concern_category}\nSeverity Level: ${concern.severity_distress_level}\n\n<customer_email>\n${email}\n</customer_email>`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2500 },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    });

    let fullText = "";
    try {
      fullText = result.response.text();
    } catch (textError) {
      throw new Error("AI returned an empty or unreadable response.");
    }

    if (!fullText || fullText.trim() === "") {
      throw new Error("AI returned an empty response. The input may have been flagged or blocked.");
    }

    // Extract the <reply> block if present
    let finalReply = fullText;
    const replyMatch = fullText.match(/<reply>([\s\S]*?)(?:<\/reply>|$)/i);
    if (replyMatch && replyMatch[1]) {
      finalReply = replyMatch[1];
    } else {
        // Strip out thinking/emotion blocks if <reply> isn't clearly demarcated but tags exist
        finalReply = finalReply.replace(/<emotion_read>[\s\S]*?<\/emotion_read>/gi, "");
        finalReply = finalReply.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");
    }

    finalReply = finalReply.replace(/<\/?reply>/gi, "");
    finalReply = finalReply.replace(/```(?:xml|html)?/gi, "");
    finalReply = finalReply.trim();

    if (!finalReply) {
      return NextResponse.json({ error: "The AI generated an empty reply." }, { status: 500 });
    }

    return NextResponse.json({ response: finalReply });
  } catch (error: any) {
    console.error("CRM Generate Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate response." }, { status: 500 });
  }
}
