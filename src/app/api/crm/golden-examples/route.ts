import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET: Fetch golden examples, optionally filtered by category
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    let query = supabaseAdmin
      .from("golden_examples")
      .select("*")
      .order("created_at", { ascending: false });

    if (category) {
      query = query.eq("concern_category", category);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ examples: data });
  } catch (error: any) {
    console.error("Golden Examples GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch golden examples" }, { status: 500 });
  }
}

// POST: Save a new golden example (promote an approved response)
export async function POST(req: Request) {
  try {
    const { concern_category, sub_reason, customer_email, approved_response, source_concern_id } = await req.json();

    if (!concern_category || !customer_email || !approved_response) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("golden_examples")
      .insert({
        concern_category,
        sub_reason: sub_reason || null,
        customer_email,
        approved_response,
        source_concern_id: source_concern_id || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ example: data });
  } catch (error: any) {
    console.error("Golden Examples POST Error:", error);
    return NextResponse.json({ error: "Failed to save golden example" }, { status: 500 });
  }
}
