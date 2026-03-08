"use client"

import { useState, useEffect } from "react"
import { Save, Settings2, FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

export default function SettingsHubPage() {
  const [sops, setSops] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/crm/settings")
        if (res.ok) {
          const data = await res.json()
          setSops(data.sops || "")
        }
      } catch (e) {
        toast.error("Failed to load SOP settings")
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("/api/crm/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sops })
      })

      if (!res.ok) {
        toast.error("Failed to save SOPs")
        return
      }
      toast.success("Settings updated successfully")
    } catch (e) {
      toast.error("Network error saving settings")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-[1400px] mx-auto w-full relative z-10 pb-4">
      <header className="pb-6 pt-2 md:pt-6 flex flex-col items-start justify-start relative z-10 shrink-0">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-1 font-heading flex flex-row items-center gap-2">
          <Settings2 className="w-7 h-7 text-primary" /> Settings Hub
        </h2>
        <p className="text-[14px] md:text-[15px] text-muted-foreground">Manage global configurations and AI instructions.</p>
      </header>

      <div className="flex-1 min-h-0 bg-transparent flex flex-col gap-6 max-w-4xl mx-auto w-full">
        <Card className="w-full flex-1 flex flex-col shadow-sm border-border/60">
          <CardHeader className="bg-muted/20 border-b border-border/40 shrink-0 py-5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-primary" />
              Neurotoned Trauma-Informed SOPs
            </CardTitle>
            <CardDescription className="text-sm">
              These guidelines are injected into the Gemini context window before every single AI resolution generation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-6 flex flex-col min-h-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary/50" />
                <p>Loading configurations...</p>
              </div>
            ) : (
              <Textarea 
                value={sops}
                onChange={(e) => setSops(e.target.value)}
                placeholder="Paste your proprietary SOPs here. E.g. 'Never say I understand...' "
                className="flex-1 resize-none font-mono text-sm p-4 leading-relaxed bg-background/50 border-border/50 focus-visible:ring-1 focus-visible:ring-primary shadow-inner"
              />
            )}
          </CardContent>
          <CardFooter className="bg-muted/20 border-t border-border/40 py-4 flex justify-end shrink-0">
            <Button onClick={handleSave} disabled={isLoading || isSaving} className="font-semibold px-6 shadow-sm">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {isSaving ? "Saving..." : "Save Configuration"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
