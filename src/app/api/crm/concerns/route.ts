import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("neurotoned_admin_token")?.value;
    if (token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
