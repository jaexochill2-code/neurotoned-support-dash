"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Copy, CheckCircle2, MessageSquareText, PenLine, Send, CornerDownLeft, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SeverityBadge } from "./severity-badge"
import { StatusBadge } from "./status-badge"

export function ResolutionWorkspaceClient({ initialConcern }: { initialConcern: any }) {
  const router = useRouter()
  const [concern, setConcern] = useState(initialConcern)
  const [response, setResponse] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    setResponse("")

    try {
      const res = await fetch("/api/crm/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: concern.id })
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to generate response")
        return
      }

      setResponse(data.response)
      toast.success("Response generated successfully.")
    } catch (error) {
      console.error(error)
      toast.error("Network error generation failed.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleMarkResolved = async () => {
    setIsResolving(true)
    try {
      const res = await fetch(`/api/crm/concerns/${concern.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Resolved" })
      })
      const data = await res.json()
      
      if (!res.ok) {
        toast.error(data.error || "Failed to update status")
        return
      }
      
      setConcern(data.concern)
      toast.success("Concern marked as Resolved")
      router.refresh()
    } catch (e) {
      toast.error("Failed to update status")
    } finally {
      setIsResolving(false)
    }
  }

  const handleCopy = () => {
    if (!response) return
    navigator.clipboard.writeText(response)
    setCopied(true)
    toast.success("Response copied to clipboard!")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <div className="flex-1 flex flex-col bg-card border border-border rounded-xl overflow-hidden shadow-sm h-full w-1/3">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <Link href="/crm/concerns" className="mr-2 text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-4 h-4" /></Link>
            <MessageSquareText className="w-4 h-4 text-primary" />
            <span className="text-[11px] md:text-xs font-semibold tracking-wide text-foreground uppercase">Incoming Concern</span>
          </div>
          <StatusBadge status={concern.status} />
        </div>

        <div className="flex-1 p-5 overflow-y-auto">
          <div className="mb-6 space-y-4">
               <div>
                 <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Customer</p>
                 <p className="font-semibold">{concern.customer_name}</p>
                 <p className="text-sm text-muted-foreground">{concern.customer_email_address}</p>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Category</p>
                   <span className="bg-muted px-2 py-1 rounded text-xs font-medium">{concern.concern_category}</span>
                 </div>
                 <div>
                   <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Severity</p>
                   <SeverityBadge severity={concern.severity_distress_level} />
                 </div>
               </div>
          </div>
          <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3">Raw Customer Email</p>
              <div className="p-4 bg-muted/30 rounded-lg text-[15px] text-foreground leading-relaxed whitespace-pre-wrap border border-border/50">
                {concern.raw_customer_email}
              </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-border bg-card shrink-0">
          <Button onClick={handleGenerate} disabled={isGenerating} size="lg" className="w-full bg-[#7C9885] hover:bg-[#6A8573] text-white shadow-sm font-medium text-[15px]">
            {isGenerating ? <Sparkles className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {isGenerating ? "Drafting Response..." : "Generate Trauma-Informed Response"}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-card border border-border rounded-xl overflow-hidden shadow-sm h-full w-2/3">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <PenLine className="w-4 h-4 text-primary" />
            <span className="text-[11px] md:text-xs font-semibold tracking-wide text-foreground uppercase">AI Generated Output</span>
          </div>
          <div className="flex gap-2">
            {response && (
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary hover:bg-primary/20 rounded-md px-3">
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
            )}
            {concern.status !== "Resolved" && response && (
                <Button variant="default" size="sm" disabled={isResolving} onClick={handleMarkResolved} className="h-8 text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white rounded-md px-3">
                  {isResolving ? "Updating..." : "Mark Resolved"}
                </Button>
            )}
          </div>
        </div>

        <div className="flex-1 p-5 md:p-8 relative overflow-y-auto bg-card/50">
          <AnimatePresence mode="wait">
            {!isGenerating && !response && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4 border border-border">
                  <Sparkles className="w-6 h-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground/80 max-w-[250px]">Review the customer's context and click generate when ready to formulate a reply.</p>
              </motion.div>
            )}

            {isGenerating && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 pt-2">
                <Skeleton className="h-5 w-3/4 bg-muted rounded-md" />
                <Skeleton className="h-5 w-full bg-muted rounded-md" />
                <Skeleton className="h-5 w-5/6 bg-muted rounded-md" />
                <div className="h-4" />
                <Skeleton className="h-5 w-full bg-muted rounded-md" />
                <Skeleton className="h-5 w-4/6 bg-muted rounded-md" />
              </motion.div>
            )}

            {!isGenerating && response && (
              <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-[15px] text-foreground pb-10">
                {response}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  )
}
