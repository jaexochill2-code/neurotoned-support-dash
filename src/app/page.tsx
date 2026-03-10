"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, Copy, CheckCircle2, MessageSquareText, PenLine, Send, CornerDownLeft } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function WorkspacePage() {
  const [email, setEmail] = useState("")
  const [response, setResponse] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const [activeTab, setActiveTab] = useState<"message" | "reply">("message")

  const handleGenerate = async () => {
    if (!email.trim()) {
      toast.error("Please paste a message first.")
      return
    }

    setIsGenerating(true)
    setResponse("")
    setActiveTab("reply") // Auto-switch tab on mobile

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
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
            
            <div className="mt-4 pt-4 border-t border-[#152218]/50 flex items-center justify-between shrink-0 sticky bottom-0 bg-card">
              <span className="text-[11px] text-[#547A63] items-center gap-1.5 opacity-0 md:group-hover:opacity-100 transition-opacity hidden sm:flex font-medium">
                <kbd className="bg-[#0D1E14] border border-[#152218] px-1.5 rounded flex items-center gap-1 py-0.5 font-mono text-[10px]">⌘<CornerDownLeft className="w-2.5 h-2.5" /></kbd> generate
              </span>
              <Button onClick={handleGenerate} disabled={isGenerating || !email.trim()} className={cn("h-10 px-8 rounded-xl font-semibold text-[13px] shadow transition-all hover-lift-premium w-full sm:w-auto", email.trim() ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-[#0D1E14] text-[#547A63] cursor-not-allowed border border-[#152218]")}>
                {isGenerating ? <Sparkles className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {isGenerating ? "Drafting..." : "Generate Reply"}
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
                  className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-[16px] md:text-[15px] text-foreground pb-10">
                  {response}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
