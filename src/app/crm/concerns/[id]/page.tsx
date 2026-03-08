import { supabaseAdmin } from "@/lib/supabase-admin"
import { notFound } from "next/navigation"
import { ResolutionWorkspaceClient } from "@/components/crm/resolution-workspace"

export const revalidate = 0

export default async function ResolutionWorkspacePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;

  // 1. Fetch the concern details
  const { data: concern, error } = await supabaseAdmin
    .from("customer_concerns")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !concern) {
    console.error("Concern fetch error:", error);
    notFound();
  }

  // Pass initial data to client component
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-[1400px] mx-auto w-full relative z-10 pb-4">
      <header className="pb-6 pt-2 md:pt-6 flex flex-col items-start justify-start relative z-10 shrink-0">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-1 font-heading">Resolution Workspace</h2>
        <p className="text-[14px] md:text-[15px] text-muted-foreground">Review context and generate trauma-informed response.</p>
      </header>

      <div className="flex-1 min-h-0 bg-transparent flex gap-6">
        <ResolutionWorkspaceClient initialConcern={concern} />
      </div>
    </div>
  )
}
