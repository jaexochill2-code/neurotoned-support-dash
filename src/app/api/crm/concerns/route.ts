import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sort') || 'date_received';
    const direction = searchParams.get('dir') === 'asc' ? true : false;

    // We can map specific visual sorts to database realities
    let query = supabaseAdmin.from("customer_concerns").select("*").order(sortBy, { ascending: direction });

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ concerns: data });
  } catch (error: any) {
    console.error("Fetch CRM Concerns Error:", error);
    return NextResponse.json({ error: "Failed to fetch concerns" }, { status: 500 });
  }
}
