import { ConcernAnalyticsChart } from "@/components/crm/analytics-chart";

export const revalidate = 0; // Disable caching to always show live DB state

export default function ConcernsDashboard() {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 w-full relative z-10 pb-4">
      <ConcernAnalyticsChart />
    </div>
  );
}
