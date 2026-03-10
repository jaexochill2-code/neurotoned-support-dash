"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle, X } from "lucide-react"

export function AnnouncementProvider({ children }: { children: React.ReactNode }) {
  const [urgentUpdate, setUrgentUpdate] = useState("")
  const [isDismissed, setIsDismissed] = useState(false)

  const fetchAnnouncement = async () => {
    try {
      const res = await fetch("/api/sops?public=1")
      if (res.ok) {
        const data = await res.json()
        const update = data.urgentUpdate || ""
        
        if (update !== urgentUpdate) {
          setUrgentUpdate(update)
          
          // Check if this specific update was dismissed
          const dismissedUpdate = localStorage.getItem("dismissedUpdate")
          if (dismissedUpdate === update) {
            setIsDismissed(true)
          } else {
            setIsDismissed(false)
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch announcement", e)
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchAnnouncement()
    
    // Poll every 30 seconds
    const interval = setInterval(fetchAnnouncement, 30000)
    
    // Listen for custom events in case a component forces an update
    const handleForceUpdate = () => fetchAnnouncement()
    window.addEventListener("refresh-announcement", handleForceUpdate)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener("refresh-announcement", handleForceUpdate)
    }
  }, [urgentUpdate])

  const handleDismiss = () => {
    setIsDismissed(true)
    if (urgentUpdate) {
      localStorage.setItem("dismissedUpdate", urgentUpdate)
    }
  }

  const showBanner = urgentUpdate && !isDismissed

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="overflow-hidden bg-background sticky top-0 z-50 w-full shrink-0 border-b border-border/50"
          >
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border-b border-amber-500/20 w-full relative">
              <div className="shrink-0 pl-1 md:pl-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0 pr-8">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-500/70 block mb-0.5">Team Alert</span>
                <p className="text-[13px] font-semibold text-amber-400 leading-snug">{urgentUpdate}</p>
              </div>
              <button
                onClick={handleDismiss}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-amber-500/10 text-amber-500/50 hover:text-amber-500 transition-colors shrink-0"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  )
}
