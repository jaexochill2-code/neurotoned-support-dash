import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const revalidate = 0;

import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("neurotoned_admin_token")?.value;
    if (token !== "authenticated") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Parse optional range param (1, 7, or 30 days) ──────────────────
    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get("range");
    const rangeDays = rangeParam ? parseInt(rangeParam, 10) : null;
    const validRanges = [1, 7, 30];
    const range = rangeDays && validRanges.includes(rangeDays) ? rangeDays : null;

    // ── Build query ────────────────────────────────────────────────────
    let query = supabaseAdmin
      .from("customer_concerns")
      .select("concern_category, sub_reason, date_received");

    // Current period cutoff
    let cutoffISO: string | null = null;
    let prevStartISO: string | null = null;
    let prevEndISO: string | null = null;

    if (range) {
      const now = new Date();
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - range);
      cutoffISO = cutoff.toISOString();

      // Previous period: the equivalent window just before the current one
      const prevEnd = new Date(cutoff);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - range);
      prevStartISO = prevStart.toISOString();
      prevEndISO = prevEnd.toISOString();

      query = query.gte("date_received", cutoffISO);
    }

    const { data: concerns, error } = await query;
    if (error) throw error;

    // ── Aggregate current period ───────────────────────────────────────
    const categoryMap: Record<string, number> = {};
    const drilldownMap: Record<string, Record<string, number>> = {};
    const todayStr = new Date().toISOString().slice(0, 10);
    let answeredToday = 0;

    for (const row of concerns ?? []) {
      const cat = row.concern_category;
      const sub = row.sub_reason;

      if (cat) {
        categoryMap[cat] = (categoryMap[cat] ?? 0) + 1;
        if (sub && sub !== "other" && sub !== "unknown") {
          if (!drilldownMap[cat]) drilldownMap[cat] = {};
          drilldownMap[cat][sub] = (drilldownMap[cat][sub] ?? 0) + 1;
        }
      }

      if (row.date_received?.slice(0, 10) === todayStr) answeredToday++;
    }

    const total = concerns?.length ?? 0;

    const categoryData = Object.entries(categoryMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const drilldown: Record<string, { name: string; count: number }[]> = {};
    for (const [cat, subMap] of Object.entries(drilldownMap)) {
      drilldown[cat] = Object.entries(subMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    }

    // ── Delta calculation (previous equivalent period) ─────────────────
    let deltaPercent: number | null = null;

    if (range && prevStartISO && prevEndISO) {
      const { count: prevCount, error: prevError } = await supabaseAdmin
        .from("customer_concerns")
        .select("*", { count: "exact", head: true })
        .gte("date_received", prevStartISO)
        .lt("date_received", prevEndISO);

      if (!prevError && prevCount !== null && prevCount > 0) {
        deltaPercent = Math.round(((total - prevCount) / prevCount) * 100);
      } else if (!prevError && (prevCount === 0 || prevCount === null) && total > 0) {
        deltaPercent = 100; // All new, 100% increase
      } else {
        deltaPercent = 0;
      }
    }

    return NextResponse.json({
      total,
      answeredToday,
      categoryData,
      drilldown,
      deltaPercent,
      activeRange: range,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
