"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileText, Trash2, Save, CheckCircle2, Lock, BookOpen,
  ChevronDown, ChevronUp, FilePlus, Search, AlertCircle,
  Hash, Layers, ShoppingBag, MessageSquare, Shield, RefreshCw, ChevronRight, Edit3, ArrowLeft
} from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type KBFile = {
  id: string
  title: string
  category: string
  brand: string
  content: string
  updatedAt: string
}

// ── Category config ────────────────────────────────────────────────────────
const CATEGORIES = [
  { name: "Logins & Passwords", icon: Lock,           color: "hsl(280, 60%, 75%)" },
  { name: "Product Info",       icon: ShoppingBag,    color: "hsl(200, 70%, 70%)" },
  { name: "Refund Policies",    icon: RefreshCw,      color: "hsl(35,  80%, 70%)" },
  { name: "Response Templates", icon: MessageSquare,  color: "hsl(158, 60%, 65%)" },
  { name: "Safety & Compliance",icon: Shield,         color: "hsl(0,   75%, 70%)" },
  { name: "General",            icon: FileText,       color: "hsl(220, 20%, 65%)" },
]
const ALL_CAT_NAMES = CATEGORIES.map(c => c.name)
const BRAND_OPTIONS = ["All","Serotoned","Neurotoned","Aya Caps","FlowRegen","Noctiflo","Reconnect+"]

function brandColor(brand: string) {
  if (brand === 'Serotoned') return '#60A5FA'
  if (brand === 'Neurotoned') return '#34D399'
  if (brand === 'Aya Caps') return '#FBBF24'
  if (brand === 'FlowRegen') return '#F87171'
  if (brand === 'Noctiflo') return '#A78BFA'
  if (brand === 'Reconnect+') return '#F472B6'
  return '#94A3B8'
}
function wordCount(text: string) {
  return { words: text.trim().split(/\s+/).filter(Boolean).length, chars: text.length }
}
function extractHeadings(text: string) {
  return text.split("\n").filter(l => l.startsWith("## ")).map(l => l.replace(/^##\s+/, "")).slice(0, 10)
}

function parseBold(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={idx} className="font-semibold text-[#F4F8F5]">{part.slice(2, -2)}</strong>;
    }
    return <span key={idx}>{part}</span>;
  });
}

// ── Premium Markdown Reader Component ───────────────────────────────────────
function MarkdownReader({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="font-sans">
      {lines.map((line, i) => {
        const t = line.trim()
        if (t.startsWith('## ')) {
          const headingText = t.slice(3);
          const id = `heading-${headingText.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
          return <h2 key={i} id={id} className="text-2xl font-semibold tracking-tight mt-10 mb-4 text-[#F4F8F5]">{headingText}</h2>
        }
        if (t.startsWith('### ')) return <h3 key={i} className="text-lg font-medium tracking-tight mt-6 mb-3 text-[#C8D8CC]">{t.slice(4)}</h3>
        if (t.startsWith('- ')) {
          return (
            <div key={i} className="flex gap-3 mb-2 items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-2 shrink-0" />
              <span className="leading-relaxed text-[15px] text-muted-foreground">
                {parseBold(t.slice(2))}
              </span>
            </div>
          )
        }
        if (t === '') return <div key={i} className="h-4" />
        
        return <p key={i} className="leading-relaxed text-[15px] text-muted-foreground mb-2">
          {parseBold(line)}
        </p>
      })}
    </div>
  )
}

// ── Main Page Component ───────────────────────────────────────────────────
export default function KnowledgeBasePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth]   = useState(true)
  const [showLoginModal, setShowLoginModal]   = useState(false)
  const [password, setPassword]               = useState("")
  const [authError, setAuthError]             = useState("")
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  const [files, setFiles]           = useState<KBFile[]>([])
  const [isLoadingKb, setIsLoadingKb] = useState(true)
  const [isSavingKb, setIsSavingKb]   = useState(false)
  const [activeId, setActiveId]       = useState<string | null>(null)

  const [sops, setSops]           = useState("")
  const [isLoadingSops, setIsLoadingSops] = useState(true)
  const [isSavingSops, setIsSavingSops]   = useState(false)
  const [rulesOpen, setRulesOpen]         = useState(false)

  // Editor modes
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle,    setEditTitle]    = useState("")
  const [editContent,  setEditContent]  = useState("")
  const [editCategory, setEditCategory] = useState("General")
  const [editBrand,    setEditBrand]    = useState("All")
  const [hasUnsaved,   setHasUnsaved]   = useState(false)

  const [search,    setSearch]    = useState("")
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const [mobileView, setMobileView] = useState<"list" | "reader">("list")

  const activeFile = files.find(f => f.id === activeId)

  const grouped = CATEGORIES.reduce<Record<string, KBFile[]>>((acc, cat) => {
    acc[cat.name] = files.filter(f => f.category === cat.name && (
      !search || f.title.toLowerCase().includes(search.toLowerCase())
    ))
    return acc
  }, {})

  const loadFiles = async () => {
    try {
      const res = await fetch("/api/kb")
      if (res.ok) {
        const data = await res.json()
        setFiles(data.files || [])
        if (!activeId && data.files?.length) {
          setActiveId(data.files[0].id)
          // On fresh load on mobile, keep it on list view even if we auto-select the first item
          if (window.innerWidth < 768) setMobileView("list")
        }
      }
    } catch { toast.error("Failed to load documents.") }
    finally { setIsLoadingKb(false) }
  }

  useEffect(() => {
    const init = async () => {
      try { const r = await fetch("/api/auth"); if (r.ok) setIsAuthenticated(true) } catch {} finally { setIsCheckingAuth(false) }
      try { const r = await fetch("/api/sops"); if (r.ok) setSops((await r.json()).sops || "") } catch {} finally { setIsLoadingSops(false) }
      await loadFiles()
    }
    init()
  }, []) // eslint-disable-line

  useEffect(() => {
    if (activeFile) {
      setEditTitle(activeFile.title)
      setEditContent(activeFile.content)
      setEditCategory(activeFile.category)
      setEditBrand(activeFile.brand)
      setHasUnsaved(false)
      setIsEditing(false)
    }
  }, [activeId, activeFile])

  useEffect(() => {
    if (!activeFile) return
    setHasUnsaved(
      editTitle !== activeFile.title || 
      editContent !== activeFile.content || 
      editCategory !== activeFile.category || 
      editBrand !== activeFile.brand
    )
  }, [editTitle, editContent, editCategory, editBrand, activeFile])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(""); setIsAuthenticating(true)
    try {
      const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) })
      if (res.ok) {
        setIsAuthenticated(true); setShowLoginModal(false); setPassword(""); toast.success("Admin mode unlocked.")
      } else setAuthError("Incorrect password")
    } catch { setAuthError("Authentication failed") }
    finally { setIsAuthenticating(false) }
  }

  const handleSave = useCallback(async () => {
    if (!activeFile || !editTitle.trim()) { toast.error("Title required"); return }
    setIsSavingKb(true)
    try {
      const isNew = activeFile.id.startsWith("new-kb-")
      const res = await fetch("/api/kb", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, content: editContent, category: editCategory, brand: editBrand, originalId: isNew ? null : activeFile.id })
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      await loadFiles()
      setActiveId(data.id)
      setHasUnsaved(false)
      setIsEditing(false)
      toast.success("Saved successfully.")
    } catch { toast.error("Failed to save.") }
    finally { setIsSavingKb(false) }
  }, [activeFile, editTitle, editContent, editCategory, editBrand])

  useEffect(() => {
    if (!isAuthenticated) return
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSave() } }
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h)
  }, [handleSave, isAuthenticated])

  const handleDelete = async () => {
    if (!activeFile || !confirm(`Delete "${activeFile.title}"?`)) return
    if (activeFile.id.startsWith("new-kb-")) {
      setFiles(files.filter(f => f.id !== activeId)); setActiveId(files[1]?.id ?? null); return
    }
    try {
      await fetch(`/api/kb?id=${encodeURIComponent(activeFile.id)}`, { method: "DELETE" })
      const newFiles = files.filter(f => f.id !== activeFile.id)
      setFiles(newFiles); setActiveId(newFiles[0]?.id ?? null); toast.success("Deleted.")
    } catch { toast.error("Failed to delete.") }
  }

  const handleNewDoc = () => {
    const id = `new-kb-${Date.now()}`
    setFiles([{ id, title: "New Document", category: "General", brand: "All", content: "## Overview\n\nAdd your content here.\n", updatedAt: new Date().toISOString() }, ...files])
    setActiveId(id)
    setIsEditing(true)
    setMobileView("reader")
  }

  const handleSaveSops = async () => {
    setIsSavingSops(true)
    try {
      await fetch("/api/sops", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sops }) })
      toast.success("Global rules saved.")
    } catch { toast.error("Failed.") }
    finally { setIsSavingSops(false) }
  }

  const { words, chars } = wordCount(editContent)
  const headings = extractHeadings(activeFile?.content || "")

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto w-full pb-16 relative">
      
      {/* HEADER */}
      <header className={cn("pt-6 md:pt-10 pb-8 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4", mobileView === "reader" && "hidden md:flex")}>
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#F4F8F5] font-heading">
            Knowledge hub
          </h1>
          <p className="text-[13px] text-[#547A63] mt-1.5">
            Your team's source of truth.
          </p>
        </div>
        <div className="flex items-center gap-3 self-end md:self-auto">
          {isAuthenticated && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-lg border border-primary/20">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold tracking-widest uppercase">Admin</span>
            </motion.div>
          )}
          {isAuthenticated && (
            <Button onClick={handleNewDoc} className="hover-lift-premium gap-2 px-5 rounded-xl bg-primary hover:bg-primary/90 text-[13px] font-semibold h-10">
              <FilePlus className="h-4 w-4" /> New Doc
            </Button>
          )}
        </div>
      </header>

      {/* GLOBAL RULES (Admin) */}
      <AnimatePresence>
        {isAuthenticated && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="bg-card border border-border rounded-2xl overflow-hidden relative z-10">
            <button onClick={() => setRulesOpen(o => !o)} className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#0D1E14] transition-colors">
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-primary" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Global Fallback Rules</span>
              </div>
              <motion.div animate={{ rotate: rulesOpen ? 180 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            </button>
            <AnimatePresence>
              {rulesOpen && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="overflow-hidden">
                  <div className="px-6 pb-5">
                    <Textarea value={sops} onChange={e => setSops(e.target.value)} className="min-h-[160px] resize-none bg-background border border-border rounded-xl p-5 text-[13px] font-mono mb-3 focus-visible:ring-1 focus-visible:ring-primary/50 text-[#F4F8F5]" />
                    <div className="flex justify-end">
                      <Button onClick={handleSaveSops} disabled={isSavingSops} size="sm" className="gap-2 rounded-lg h-9">
                        <Save className="h-4 w-4" /> Save Rules
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TWO-PANE LAYOUT */}
      <div className="flex flex-1 min-h-[600px] bg-card border border-border rounded-xl overflow-hidden shadow-sm relative z-10">
        
        {/* SIDEBAR */}
        <div className={cn("w-full md:w-[300px] shrink-0 border-r border-border flex flex-col bg-muted/30 z-20 transition-all", mobileView === "reader" && "hidden md:flex")}>
          <div className="p-4 border-b border-border relative bg-transparent">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <input type="text" placeholder="Search docs... (Press Cmd+K)" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2.5 text-[13px] font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all" />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3">
              {isLoadingKb ? (
                <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg bg-primary/5" />)}</div>
              ) : (
                CATEGORIES.map(cat => {
                  const docs = grouped[cat.name] || []
                  if (!docs.length && !search) return null
                  const Icon = cat.icon
                  const isCollapsed = collapsed.has(cat.name)

                  return (
                    <motion.div layout key={cat.name} className="mb-4">
                      {/* Category Header */}
                      <button onClick={() => setCollapsed(p => { const n = new Set(p); n.has(cat.name) ? n.delete(cat.name) : n.add(cat.name); return n })}
                        className="w-full flex items-center justify-between px-2 mb-1.5 group">
                        <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#547A63] group-hover:text-foreground transition-colors flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                          {cat.name}
                        </span>
                        <motion.div animate={{ rotate: isCollapsed ? -90 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                          <ChevronDown className="w-3.5 h-3.5 text-[#547A63] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </motion.div>
                      </button>

                      {/* Doc Items */}
                      <AnimatePresence initial={false}>
                        {!isCollapsed && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="overflow-hidden">
                            <div className="space-y-1 mt-1">
                              {docs.length === 0 ? <p className="px-2 text-[12px] text-muted-foreground/50 italic py-1">None found</p> : docs.map(file => {
                                const isActive = activeId === file.id
                                const hasDot = file.brand !== "All"

                                return (
                                  <motion.button layoutId={`card-${file.id}`} key={file.id} 
                                    onClick={() => { setActiveId(file.id); setMobileView("reader") }}
                                    className={cn("w-full text-left rounded-md transition-all duration-200 group relative overflow-hidden",
                                      isActive 
                                        ? "bg-background shadow-sm border border-border" 
                                        : "hover:bg-muted/50 border border-transparent"
                                    )}>
                                    {/* Active subtle left border */}
                                    {isActive && <motion.div layoutId="active-indicator" className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />}
                                    
                                    <div className={cn("py-2.5 pr-3", isActive ? "pl-4" : "pl-3")}>
                                      <div className="flex items-center gap-2">
                                        {hasDot 
                                          ? <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: brandColor(file.brand) }} />
                                          : <span className="w-2 shrink-0" />
                                        }
                                        <span className={cn("text-[13px] font-medium truncate", isActive ? "text-[#F4F8F5]" : "text-muted-foreground")}>
                                          {file.title}
                                        </span>
                                      </div>
                                    </div>
                                  </motion.button>
                                )
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })
              )}
            </div>
          </ScrollArea>

          {/* Admin Unlock */}
          {!isAuthenticated && !isCheckingAuth && (
            <div className="p-4 border-t border-border bg-transparent">
              <button onClick={() => setShowLoginModal(true)} className="w-full flex items-center justify-center gap-2 text-[12px] font-semibold text-muted-foreground hover:text-foreground py-2 rounded-lg hover:bg-muted/50 transition-all">
                <Lock className="h-3.5 w-3.5" /> Unlock Editor
              </button>
            </div>
          )}
        </div>

        {/* RIGHT PANE */}
        <div className={cn("flex-1 flex flex-col min-w-0 bg-card relative z-10", mobileView === "list" && "hidden md:flex")}>
          {!activeId ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center text-muted-foreground/60 p-8 text-center">
              <BookOpen className="w-16 h-16 mb-4 opacity-30 drop-shadow-sm" />
              <p className="text-lg font-medium tracking-tight">Select a document</p>
            </motion.div>
          ) : (
            <motion.div key={activeId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="flex flex-col h-full">

              {/* Unsaved Banner (Admin) */}
              <AnimatePresence>
                {isAuthenticated && hasUnsaved && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20 shadow-inner gap-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0" />
                        <span className="text-[13px] text-amber-800 dark:text-amber-400 font-semibold tracking-wide">Unsaved changes in editor</span>
                      </div>
                      <button onClick={handleSave} disabled={isSavingKb} className="text-[12px] font-bold text-amber-700 hover:text-amber-900 dark:hover:text-amber-200 transition-colors bg-white/50 dark:bg-black/20 px-3 py-1.5 sm:py-1 rounded-md shadow-sm border border-amber-200/50 dark:border-amber-500/20 whitespace-nowrap">Save now</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 md:px-8 py-4 sm:py-5 border-b border-border bg-transparent shrink-0 relative z-20 gap-4">
                <div className="flex items-start gap-3 w-full sm:w-auto">
                  <button 
                    onClick={() => setMobileView("list")}
                    className="md:hidden mt-0.5 p-1.5 -ml-2 rounded-md hover:bg-muted text-muted-foreground transition-colors shrink-0"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    {/* Brand Pill (if exists) */}
                    {activeFile?.brand !== "All" && (
                      <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-md w-fit bg-[#0D1E14] text-[#547A63] border border-[#152218]">
                        {activeFile?.brand}
                      </motion.span>
                    )}
                  {/* Title Input / Display */}
                  {isEditing ? (
                    <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="text-2xl font-bold tracking-tight bg-transparent border-none shadow-none px-0 h-auto focus-visible:ring-0 placeholder:opacity-40 text-[#F4F8F5]" placeholder="Title..." />
                  ) : (
                    <h2 className="text-2xl font-bold tracking-tight text-[#F4F8F5]">{activeFile?.title}</h2>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-[11px] md:text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-sm"><Hash className="w-3 h-3"/>{isEditing ? editCategory : activeFile?.category}</span>
                    <span className="hidden sm:inline">&bull;</span>
                    <span className="hidden sm:inline">Updated {activeFile?.updatedAt ? formatDistanceToNow(new Date(activeFile.updatedAt), {addSuffix: true}) : 'recently'}</span>
                  </div>
                </div>
              </div>

              {/* Editor Controls / Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {isAuthenticated && (
                  <>
                    {isEditing ? (
                      <>
                        <select value={editCategory} onChange={e => setEditCategory(e.target.value)} className="text-[12px] px-3 py-1.5 rounded-lg border border-[#152218] bg-[#0D1E14] text-[#C8D8CC] focus:outline-none focus:ring-1 focus:ring-primary font-medium">
                          {ALL_CAT_NAMES.map(c => <option key={c}>{c}</option>)}
                        </select>
                        <select value={editBrand} onChange={e => setEditBrand(e.target.value)} className="text-[12px] px-3 py-1.5 rounded-lg border border-[#152218] bg-[#0D1E14] text-[#C8D8CC] focus:outline-none focus:ring-1 focus:ring-primary font-medium">
                          {BRAND_OPTIONS.map(b => <option key={b}>{b}</option>)}
                        </select>
                        <Button onClick={handleDelete} disabled={isSavingKb} variant="ghost" className="h-8 w-8 p-0 text-[#547A63] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => setIsEditing(false)} variant="outline" className="h-8 px-4 text-[12px] font-medium rounded-lg border-[#152218] bg-[#0D1E14] text-muted-foreground">Cancel</Button>
                        <Button onClick={handleSave} disabled={isSavingKb} className={cn("h-8 px-4 text-[12px] font-medium rounded-lg transition-all", hasUnsaved ? "bg-primary hover:bg-primary/90" : "bg-[#0D1E14] border border-[#152218] text-[#547A63]")}>
                          {isSavingKb ? <Save className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-2" />} Save
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="h-8 gap-2 text-primary border-primary/20 hover:bg-primary/5 hover:border-primary/40 rounded-lg shadow-sm w-full sm:w-auto mt-2 sm:mt-0">
                        <Edit3 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Edit Doc</span>
                      </Button>
                    )}
                  </>
                )}
              </div>
              </div>

              {/* Section Jump Chips (Reader Mode Only) */}
              {!isEditing && headings.length > 0 && (
                <div className="flex items-center gap-2 px-8 py-3 bg-muted/30 border-b border-border overflow-x-auto overflow-y-hidden shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground shrink-0">Jump To</span>
                  <div className="w-[1px] h-4 bg-slate-300 dark:bg-white/10 shrink-0 mx-1.5" />
                  {headings.map(h => (
                    <button key={h} onClick={() => {
                        const id = `heading-${h.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                        const el = document.getElementById(id);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }} 
                      className="text-[12px] px-3.5 py-1 rounded-full bg-background border border-border hover:border-primary/50 hover:text-primary transition-all text-foreground font-medium whitespace-nowrap shadow-sm shrink-0">
                      {h}
                    </button>
                  ))}
                </div>
              )}

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto px-8 py-8 pb-32">
                {isEditing ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col">
                    <Textarea ref={textareaRef} value={editContent} onChange={e => setEditContent(e.target.value)}
                      placeholder="Markdown supported. Use ## for headings."
                      className="flex-1 resize-none bg-transparent border-0 p-0 text-[14px] leading-relaxed font-mono shadow-none focus-visible:ring-0 min-h-[400px] placeholder:opacity-30" />
                    <div className="flex items-center justify-between pt-6 mt-6 border-t border-[#152218] text-[11px] text-muted-foreground/50 font-mono tracking-wide">
                      <span className="flex items-center gap-1"><kbd className="bg-[#0D1E14] border border-[#152218] px-1.5 py-0.5 rounded">Ctrl+S</kbd> to save</span>
                      <span>{words.toLocaleString()} words · {chars.toLocaleString()} chars</span>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl">
                    <MarkdownReader content={activeFile?.content || ""} />
                  </motion.div>
                )}
              </div>

            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
