"use client"

import { useEffect, useState, useCallback } from "react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { motion, AnimatePresence } from "framer-motion"
import { TrendingUp, TrendingDown } from "lucide-react"

// ── Chromatic Dark Taxonomy ──────────────────────────────────────
const BIN_META: Record<string, { color: string; label: string }> = {
  "Refund":            { color: "#F87171", label: "Refund" },
  "Cancellation":      { color: "#FB7185", label: "Cancellation" },
  "Product Fit":       { color: "#A78BFA", label: "Product Fit" },
  "Marketing":         { color: "#FBBF24", label: "Marketing" },
  "Access / Login":    { color: "#34D399", label: "Login" },
  "UX / App":          { color: "#38BDF8", label: "UX / App" },
  "General":           { color: "#334155", label: "General" },
}

const DRILLDOWN_COLORS = ["#34D399", "#10B981", "#059669", "#047857", "#065F46", "#86EFAC"]

const DYNAMIC_FALLBACK_COLORS = [
  "#2DD4BF", // Teal
  "#F97316", // Orange
  "#D8B4FE", // Lilac
  "#FCD34D", // Amber
  "#60A5FA", // Blue
  "#84CC16", // Lime
]

const getStableColorForName = (name: string, index: number) => {
  if (BIN_META[name]?.color) return BIN_META[name].color
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return DYNAMIC_FALLBACK_COLORS[Math.abs(hash) % DYNAMIC_FALLBACK_COLORS.length]
}

interface Entry { name: string; count: number }
interface AnalyticsData {
  total: number
  answeredToday: number
  categoryData: Entry[]
  drilldown: Record<string, Entry[]>
  deltaPercent: number | null
  activeRange: number | null
}

// ── Time Range Options ────────────────────────────────────────────────────────
const RANGE_OPTIONS = [
  { value: "1", label: "1D" },
  { value: "7", label: "7D" },
  { value: "30", label: "30D" },
] as const

// ── Segmented Control ─────────────────────────────────────────────────────────
function TimeRangeControl({
  active,
  onChange,
}: {
  active: string | null
  onChange: (value: string | null) => void
}) {
  return (
    <div className="flex items-center bg-[#060E09] rounded-lg p-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] gap-0.5">
      {RANGE_OPTIONS.map((opt) => {
        const isActive = active === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onChange(isActive ? null : opt.value)}
            className="relative px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider z-10 transition-colors duration-200"
            style={{ color: isActive ? "#34D399" : "#2A4A35" }}
          >
            {isActive && (
              <motion.div
                layoutId="range-pill"
                className="absolute inset-0 bg-[#0F1F15] rounded-md ring-1 ring-[#1A3322]"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                style={{ zIndex: -1 }}
              />
            )}
            <span className="relative z-10 font-mono">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Delta Chip ────────────────────────────────────────────────────────────────
function DeltaChip({ percent }: { percent: number }) {
  const isPositive = percent >= 0
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8, x: -4 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.8, x: -4 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`inline-flex items-center gap-1 text-[11px] font-bold font-mono px-2 py-0.5 rounded-full ${
        isPositive
          ? "text-[#34D399] bg-[#34D399]/10"
          : "text-[#F87171] bg-[#F87171]/10"
      }`}
    >
      {isPositive ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      {isPositive ? "+" : ""}{percent}%
    </motion.span>
  )
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0].payload
  return (
    <div className="bg-[#0D1E14] border border-[#152218] px-4 py-2.5 rounded-xl shadow-xl text-sm">
      <p className="font-semibold text-[#C8D8CC]">{name}</p>
      <p className="text-[#547A63] mt-0.5">{value} concern{value !== 1 ? "s" : ""}</p>
    </div>
  )
}

// ── Range Label Helper ────────────────────────────────────────────────────────
function getRangeLabel(range: string | null): string {
  if (range === "1") return "last 24 hours"
  if (range === "7") return "last 7 days"
  if (range === "30") return "last 30 days"
  return "total concerns"
}

export function ConcernAnalyticsChart() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState<number>(-1)
  const [timeRange, setTimeRange] = useState<string | null>(null)

  // ── Fetch with optional range ───────────────────────────────────────────────
  const fetchData = useCallback((range: string | null) => {
    setIsLoading(true)
    const url = range ? `/api/crm/analytics?range=${range}` : "/api/crm/analytics"
    fetch(url)
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d) })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    fetchData(timeRange)
  }, [timeRange, fetchData])

  const handleRangeChange = useCallback((value: string | null) => {
    setTimeRange(value)
    setSelected(null) // Reset drill-down on range change
    setActiveIndex(-1)
  }, [])

  const onPieEnter = useCallback((_: any, index: number) => setActiveIndex(index), [])
  const onPieLeave = useCallback(() => setActiveIndex(-1), [])

  if (isLoading) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#34D399]/30 border-t-[#34D399] rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const isTopLevel = selected === null
  const rawData: Entry[] = isTopLevel ? data.categoryData : (data.drilldown[selected] ?? [])

  const chartData = rawData.map((entry, i) => ({
    ...entry,
    fill: isTopLevel
      ? getStableColorForName(entry.name, i)
      : DRILLDOWN_COLORS[i % DRILLDOWN_COLORS.length],
  }))

  const total = chartData.reduce((s, e) => s + e.count, 0)

  return (
    <div className="w-full relative min-h-[640px] flex flex-col items-center justify-center bg-transparent py-4">
      {/* ── Global App Background Glow (Atmospheric) ── */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{ background: "radial-gradient(ellipse at 50% 30%, #08150D 0%, #050C08 100%)" }}
      />
      
      {/* ── The Card ── */}
      <div className="relative z-10 w-full max-w-[1000px] bg-card border border-border rounded-[24px] overflow-hidden shadow-2xl shadow-black/40">
        
        {/* Header Ribbon */}
        <div className="flex items-center justify-between px-10 pt-8 pb-4">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Concern Intelligence</h3>
            <div className="flex items-center gap-3 text-[14px] text-[#547A63] font-medium">
              <span>{data.total} total</span>
              <AnimatePresence>
                {data.deltaPercent !== null && data.deltaPercent !== undefined && timeRange && (
                  <DeltaChip percent={data.deltaPercent} />
                )}
              </AnimatePresence>
              <span className="w-1 h-1 rounded-full bg-[#152218]" />
              <span>{data.answeredToday} answered today</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <TimeRangeControl active={timeRange} onChange={handleRangeChange} />

            <AnimatePresence mode="wait">
              {!isTopLevel && (
                <motion.button
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                  onClick={() => { setSelected(null); setActiveIndex(-1) }}
                  className="text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Back to overview
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Chart + Legend layout */}
        <div className="flex flex-col lg:flex-row items-center justify-center px-10 pb-12 pt-4 gap-16">

          {/* ── Donut ── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selected ?? "__top__"}_${timeRange ?? "all"}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative shrink-0"
              style={{ width: 440, height: 440 }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.length > 0 ? chartData : [{ name: "No data", count: 1, fill: "#152218" }]}
                    cx="50%" cy="50%"
                    innerRadius={150}
                    outerRadius={210}
                    paddingAngle={chartData.length > 1 ? 3 : 0}
                    dataKey="count"
                    stroke="none"
                    onMouseEnter={onPieEnter}
                    onMouseLeave={onPieLeave}
                    onClick={(entry: any) => { if (isTopLevel && entry?.name && entry.name !== "No data") setSelected(entry.name) }}
                    className={isTopLevel ? "cursor-pointer" : "cursor-default"}
                  >
                    {(chartData.length > 0 ? chartData : [{ name: "No data", count: 1, fill: "#152218" }]).map((entry, idx) => (
                      <Cell
                        key={entry.name}
                        fill={entry.fill}
                        style={{
                          transform: activeIndex === idx ? "scale(1.02)" : "scale(1)",
                          transformOrigin: "center",
                          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              {/* Center text overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${selected ?? "__top_center__"}_${timeRange ?? "all"}`}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="text-center"
                  >
                    <span className="text-[72px] font-extrabold font-heading leading-none text-white tracking-tight">
                      {chartData.length > 0 ? total : 0}
                    </span>
                    <span className="block text-[12px] font-semibold uppercase tracking-[0.15em] text-[#3A5E48] mt-2">
                      {isTopLevel ? getRangeLabel(timeRange) : selected!}
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* ── Legend ── */}
          <div className="flex-1 w-full max-w-[280px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${selected ?? "__top_legend__"}_${timeRange ?? "all"}`}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="flex flex-col gap-1 w-full"
              >
                {chartData.length === 0 ? (
                  <p className="text-[#547A63] text-sm">No data available.</p>
                ) : (
                  chartData.map((entry, index) => {
                    const isActive = activeIndex === index
                    return (
                      <button
                        key={entry.name}
                        onClick={() => { if (isTopLevel && entry.name !== "No data") setSelected(entry.name) }}
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(-1)}
                        className={`group flex items-center justify-between w-full px-4 py-3.5 rounded-lg text-left transition-colors duration-300 ${isTopLevel ? "cursor-pointer" : "cursor-default"} ${isActive ? "bg-[#0D1E14]" : "hover:bg-[#0D1E14]/50"}`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0 transition-transform duration-300"
                            style={{ background: entry.fill, transform: isActive ? "scale(1.2)" : "scale(1)" }}
                          />
                          <span className="text-[15px] font-medium text-[#B8CEBF] transition-colors group-hover:text-white">
                            {entry.name}
                          </span>
                        </div>
                        <span className="text-[16px] font-bold tabular-nums text-white">
                          {entry.count}
                        </span>
                      </button>
                    )
                  })
                )}
              </motion.div>
            </AnimatePresence>
          </div>

        </div>

        {/* Footer Hint */}
        {isTopLevel && (
          <div className="border-t border-border px-10 py-4">
            <p className="text-[11px] italic text-[#3A5E48]">Select a category to explore root causes →</p>
          </div>
        )}
      </div>
    </div>
  )
}
