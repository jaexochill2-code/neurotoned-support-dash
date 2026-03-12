"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Copy, CheckCircle2, MessageSquareText, PenLine, Send, CornerDownLeft, Lightbulb } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function WorkspacePage() {
  const [email, setEmail] = useState("")
  const [agentContext, setAgentContext] = useState("")
  const [response, setResponse] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  // ── Refund detection ────────────────────────────────────────────────────
  const [engagementPct, setEngagementPct] = useState("")
  const [exceptionNote, setExceptionNote] = useState("")
  const [refundSkipped, setRefundSkipped] = useState(false)

  const REFUND_KEYWORDS = ['refund', 'money back', 'want my money', 'get my money', 'return my money', 'give me my money']
  const isRefundDetected = REFUND_KEYWORDS.some(kw => email.toLowerCase().includes(kw))
  const refundFilled = engagementPct.trim() !== '' || exceptionNote.trim() !== ''
  
  // ── Login detection (only when not a refund email — refund takes priority) ───────
  const [passwordResetDone, setPasswordResetDone] = useState(false)
  const [tempPassword, setTempPassword] = useState("")
  const [loginSkipped, setLoginSkipped] = useState(false)

  const LOGIN_KEYWORDS = ['password', 'login', 'log in', 'sign in', 'locked out', 'forgot password', 'reset my password', "can't access", 'cannot access', "can't log", 'unable to log']
  const isLoginDetected = !isRefundDetected && LOGIN_KEYWORDS.some(kw => email.toLowerCase().includes(kw))

  const generateBlocked =
    (isRefundDetected && !refundSkipped && !(engagementPct.trim() || exceptionNote.trim())) ||
    (isLoginDetected && !loginSkipped && !passwordResetDone)

  const [activeTab, setActiveTab] = useState<"message" | "reply">("message")

  // ── Rotating enrichment hints (non-refund only) ─────────────────────────
  const ENRICH_HINTS = [
    'e.g., Changed password to HappyJae2026!',
    'e.g., Client at 15% engagement, refund approved per SOP',
    'e.g., This is a one-time purchase, no subscription to cancel',
    'e.g., Re-granted access to the 30-Day Program',
    'e.g., Customer has ADHD, keep instructions simple and short',
    'e.g., Refund already processed, just confirm the timeline',
  ]
  const [hintIndex, setHintIndex] = useState(0)

  useEffect(() => {
    if (agentContext) return
    const interval = setInterval(() => {
      setHintIndex((i) => (i + 1) % ENRICH_HINTS.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [agentContext])

  // Reset refund fields when email changes away from refund
  useEffect(() => {
    if (!isRefundDetected) {
      setRefundSkipped(false)
      setEngagementPct("")
      setExceptionNote("")
    }
  }, [isRefundDetected])

  // Reset login fields when email changes away from login
  useEffect(() => {
    if (!isLoginDetected) {
      setPasswordResetDone(false)
      setTempPassword("")
      setLoginSkipped(false)
    }
  }, [isLoginDetected])

  // Build the context string to send
  const buildContext = () => {
    // Refund enrichment
    if (isRefundDetected && !refundSkipped) {
      const parts: string[] = []
      if (engagementPct.trim()) {
        const pct = parseFloat(engagementPct)
        const hint = !isNaN(pct)
          ? pct < 15
            ? `${pct}% — below 15% threshold, follow PATH A`
            : `${pct}% — at or above 15%, follow PATH B`
          : `${engagementPct}%`
        parts.push(`Engagement: ${hint}`)
      }
      if (exceptionNote.trim()) parts.push(`Exception: ${exceptionNote.trim()}`)
      return parts.length > 0 ? parts.join(' | ') : undefined
    }
    // Login enrichment
    if (isLoginDetected && passwordResetDone) {
      const parts = ['Password reset completed.']
      if (tempPassword.trim()) parts.push(`Temporary password: ${tempPassword.trim()}.`)
      parts.push('Direct customer to https://www.neurotoned.com/login then https://www.neurotoned.com/library.')
      return parts.join(' ')
    }
    return agentContext.trim() || undefined
  }

  const handleGenerate = async () => {
    if (!email.trim()) {
      toast.error("Please paste a message first.")
      return
    }

    setIsGenerating(true)
    setResponse("")
    setActiveTab("reply")

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, agentContext: buildContext() })
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to generate response")
        setActiveTab("message")
        return
      }

      setResponse(data.response)
      toast.success("Draft ready.", {
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      })
    } catch (error: any) {
      console.error("Generation Error:", error)
      toast.error("Network error. Please try again.")
      setActiveTab("message") // Switch back if failed
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    if (!response) return
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(response)
    } else {
      const textArea = document.createElement("textarea")
      textArea.value = response
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
      } catch (err) {
        console.error('Fallback copy failed', err)
      }
      document.body.removeChild(textArea)
    }
    setCopied(true)
    toast.success("Copied to clipboard!", {
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-7xl mx-auto w-full relative z-10">
      
      {/* Page Header */}
      <header className="pb-8 pt-6 md:pt-10 flex flex-col items-start justify-start relative z-10 shrink-0">
        <h2 className="text-[28px] font-bold tracking-tight text-[#F4F8F5] mb-1.5 font-heading">Resolution center</h2>
        <p className="text-[13px] text-[#547A63]">Draft your response &rarr;</p>
      </header>

      {/* MOBILE TAB BAR */}
      <div className="flex lg:hidden bg-muted/50 p-1 rounded-lg mb-4 shrink-0">
        <button 
          onClick={() => setActiveTab("message")}
          className={cn("flex-1 text-[13px] font-semibold py-2 rounded-md transition-all", activeTab === "message" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
        >
          Message
        </button>
        <button 
          onClick={() => setActiveTab("reply")}
          className={cn("flex-1 text-[13px] font-semibold py-2 rounded-md transition-all", activeTab === "reply" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
        >
          Reply
        </button>
      </div>

      {/* DYNAMIC TWO-PANE LAYOUT */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 relative z-10 h-full">
        
        {/* LEFT PANE: Input */}
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
          className={cn("flex-1 flex flex-col bg-card border border-border rounded-xl overflow-hidden shadow-sm group h-full transition-all", activeTab !== "message" && "hidden lg:flex")}>
          
          <div className="px-5 py-3 border-b border-[#152218] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquareText className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-semibold tracking-widest text-[#F4F8F5] uppercase">Customer Message</span>
            </div>
            <span className="text-[10px] text-[#547A63] font-medium">{email.length} chars</span>
          </div>

          <div className="flex-1 p-4 md:p-5 flex flex-col relative h-full">
            <Textarea
              placeholder="Paste customer email or message..."
              className="flex-1 w-full resize-none bg-transparent border-none p-0 text-[15px] leading-relaxed shadow-none focus-visible:ring-0 placeholder:italic placeholder:text-[#547A63]/60 text-[#F4F8F5] min-h-[150px]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleGenerate() }}
            />

            {/* Enrichment Section — structured for refund, freeform otherwise */}
            <div className="mt-4 pt-4 border-t border-[#152218]/50">

              {isRefundDetected && !refundSkipped ? (
                // ── Refund Gate ──────────────────────────────────────────
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold tracking-widest text-amber-400 uppercase">
                      Refund detected — context required
                    </span>
                    <button
                      onClick={() => setRefundSkipped(true)}
                      className="text-[10px] text-[#547A63] hover:text-[#F4F8F5] underline underline-offset-2 transition-colors"
                    >
                      Skip and generate anyway
                    </button>
                  </div>

                  {/* Engagement % */}
                  <div>
                    <label className="text-[10px] text-[#547A63] font-medium mb-1 block">
                      Engagement % <span className="text-[#3A5E48]">(from Kajabi)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={engagementPct}
                      onChange={(e) => setEngagementPct(e.target.value)}
                      placeholder="e.g. 8"
                      className="w-full rounded-lg border border-[#152218] bg-[#0D1E14]/50 px-3 py-2 text-[13px] text-[#F4F8F5] placeholder:text-[#547A63]/50 focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500/30 transition-all"
                    />
                    {engagementPct !== '' && (
                      <p className={`text-[10px] mt-1 ${parseFloat(engagementPct) < 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {parseFloat(engagementPct) < 15
                          ? `${engagementPct}% — below threshold. PATH A will apply.`
                          : `${engagementPct}% — above threshold. PATH B will apply.`}
                      </p>
                    )}
                  </div>

                  {/* Exception */}
                  <div>
                    <label className="text-[10px] text-[#547A63] font-medium mb-1 block">
                      Exception <span className="text-[#3A5E48]">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={exceptionNote}
                      onChange={(e) => setExceptionNote(e.target.value)}
                      placeholder="e.g. Manager approved, VIP customer, second refund request"
                      className="w-full rounded-lg border border-[#152218] bg-[#0D1E14]/50 px-3 py-2 text-[13px] text-[#F4F8F5] placeholder:text-[#547A63]/50 focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500/30 transition-all"
                    />
                  </div>
                </motion.div>
              ) : isLoginDetected && !loginSkipped ? (
                // ── Login Gate ────────────────────────────────────────────
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold tracking-widest text-sky-400 uppercase">
                      Login issue detected — reset required
                    </span>
                    <button
                      onClick={() => setLoginSkipped(true)}
                      className="text-[10px] text-[#547A63] hover:text-[#F4F8F5] underline underline-offset-2 transition-colors"
                    >
                      Skip and generate anyway
                    </button>
                  </div>

                  {/* Reset checkbox — required to unlock generate */}
                  <label className="flex items-start gap-2.5 cursor-pointer group/check">
                    <input
                      type="checkbox"
                      checked={passwordResetDone}
                      onChange={(e) => setPasswordResetDone(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-sky-500/40 accent-sky-400 cursor-pointer shrink-0"
                    />
                    <span className="text-[12px] text-[#F4F8F5] leading-snug group-hover/check:text-sky-300 transition-colors">
                      I've manually reset this customer's password in the admin panel
                    </span>
                  </label>

                  {/* Optional temp password */}
                  {passwordResetDone && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <label className="text-[10px] text-[#547A63] font-medium mb-1 block">
                        New temporary password <span className="text-[#3A5E48]">(optional — include in reply)</span>
                      </label>
                      <input
                        type="text"
                        value={tempPassword}
                        onChange={(e) => setTempPassword(e.target.value)}
                        placeholder="e.g. Welcome2026!"
                        className="w-full rounded-lg border border-[#152218] bg-[#0D1E14]/50 px-3 py-2 text-[13px] text-[#F4F8F5] placeholder:text-[#547A63]/50 focus:outline-none focus:ring-1 focus:ring-sky-500/40 focus:border-sky-500/30 transition-all font-mono"
                      />
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                // ── Standard Agent Enrich ─────────────────────────────────
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-semibold tracking-widest text-[#547A63] uppercase">Agent Enrich</span>
                  </div>
                  <textarea
                    value={agentContext}
                    onChange={(e) => setAgentContext(e.target.value)}
                    placeholder={ENRICH_HINTS[hintIndex]}
                    rows={2}
                    className="w-full rounded-lg border border-[#152218] bg-[#0D1E14]/50 px-3 py-2 text-[13px] text-[#F4F8F5] placeholder:text-[#547A63]/50 placeholder:italic focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/30 resize-none transition-all"
                  />
                </>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-[#152218]/50 flex items-center justify-between shrink-0 sticky bottom-0 bg-card">
              <span className="text-[11px] text-[#547A63] items-center gap-1.5 opacity-0 md:group-hover:opacity-100 transition-opacity hidden sm:flex font-medium">
                <kbd className="bg-[#0D1E14] border border-[#152218] px-1.5 rounded flex items-center gap-1 py-0.5 font-mono text-[10px]">⌘<CornerDownLeft className="w-2.5 h-2.5" /></kbd> generate
              </span>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !email.trim() || generateBlocked}
                className={cn(
                  "h-10 px-8 rounded-xl font-semibold text-[13px] shadow transition-all hover-lift-premium w-full sm:w-auto",
                  (!email.trim() || generateBlocked)
                    ? "bg-[#0D1E14] text-[#547A63] cursor-not-allowed border border-[#152218]"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {isGenerating ? <Sparkles className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {isGenerating ? "Drafting..." : generateBlocked ? "Add context first" : "Generate Reply"}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* RIGHT PANE: Output */}
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.2 }}
          className={cn("flex-1 flex flex-col bg-card border border-border rounded-xl overflow-hidden shadow-sm h-full transition-all", activeTab !== "reply" && "hidden lg:flex")}>
          
          <div className="px-5 py-3 border-b border-[#152218] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <PenLine className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-semibold tracking-widest text-[#F4F8F5] uppercase">Guided output</span>
            </div>
            <AnimatePresence>
              {response && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                  <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-[10px] font-bold uppercase tracking-wider border border-[#152218]/50 text-[#F4F8F5] hover:bg-primary/10 hover:text-primary rounded-lg px-3 transition-colors">
                    {copied ? <CheckCircle2 className="h-3 w-3 mr-1.5" /> : <Copy className="h-3 w-3 mr-1.5" />}
                    {copied ? "Copied" : "Copy text"}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex-1 p-5 relative overflow-y-auto bg-card/50">
            {/* Empty State */}
            <AnimatePresence mode="wait">
              {!isGenerating && !response && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 select-none pointer-events-none">
                  <Sparkles className="w-5 h-5 text-[#152218] mb-3" />
                  <p className="text-[11px] italic text-[#3A5E48]">Waiting for input...</p>
                </motion.div>
              )}

              {/* Loading State */}
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

              {/* Result State */}
              {!isGenerating && response && (
                <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="space-y-4 leading-relaxed text-[16px] md:text-[15px] text-foreground pb-10">
                  {response.split(/\n\n+/).map((para, i) => (
                    <p key={i} className="">{para.replace(/\n/g, " ")}</p>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
