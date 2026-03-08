import { Badge } from "@/components/ui/badge"

export function StatusBadge({ status }: { status: string }) {
  if (status === "Pending") {
    return <Badge variant="outline" className="text-slate-600 border-slate-300 shadow-sm font-medium">Pending</Badge>
  }
  if (status === "In Progress") {
    return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100/90 border-transparent shadow-sm font-medium" variant="outline">In Progress</Badge>
  }
  if (status === "Resolved") {
    return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100/90 border-transparent shadow-sm font-medium" variant="outline">Resolved</Badge>
  }
  
  return <Badge variant="secondary">{status}</Badge>
}
