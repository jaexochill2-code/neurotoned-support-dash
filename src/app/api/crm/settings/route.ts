import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("crm_settings")
      .select("value")
      .eq("key", "neurotoned_sops")
      .single();

    // If it doesn't exist yet, we'll return an empty string
    if (error && error.code !== 'PGRST116') throw error;

    return NextResponse.json({ sops: data?.value || "" });
  } catch (error: any) {
    console.error("Fetch CRM Settings Error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { sops } = await req.json();

    const { data, error } = await supabaseAdmin
      .from("crm_settings")
      .upsert({ key: "neurotoned_sops", value: sops }, { onConflict: "key" })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, sops: data.value });
  } catch (error: any) {
    console.error("Update CRM Settings Error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
