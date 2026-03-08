import { Badge } from "@/components/ui/badge"

const severityConfig: Record<string, string> = {
  "Critical": "bg-[#F5C6C6] text-[#8B2020] hover:bg-[#F5C6C6]/90 border-transparent",
  "High":     "bg-[#FDE8C8] text-[#7A4A0A] hover:bg-[#FDE8C8]/90 border-transparent",
  "Medium":   "bg-[#C8DDD1] text-[#2A5C42] hover:bg-[#C8DDD1]/90 border-transparent",
  "Low":      "bg-[#D4ECD4] text-[#1A4A1A] hover:bg-[#D4ECD4]/90 border-transparent",
};

export function SeverityBadge({ severity }: { severity: string }) {
  const classes = severityConfig[severity] || "bg-muted text-muted-foreground border-transparent";
  
  return (
    <Badge className={`font-semibold tracking-wide shadow-sm py-0.5 px-2.5 ${classes}`} variant="outline">
      {severity}
    </Badge>
  );
}
