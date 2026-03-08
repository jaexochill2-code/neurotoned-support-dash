"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, ArrowRight, Lock } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  
  // Login form state
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth")
      if (res.ok) {
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
      }
    } catch {
      setIsAuthenticated(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      })

      if (res.ok) {
        setIsAuthenticated(true)
      } else {
        setError("Invalid username or password.")
        setPassword("")
      }
    } catch {
      setError("Connection error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load state
  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
      </div>
    )
  }

  // Granted state - Render the app
  if (isAuthenticated === true) {
    return <>{children}</>
  }

  // Locked state - Render the login screen
  return (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-background relative overflow-hidden font-sans">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 w-full max-w-[400px] p-6 mx-4"
      >
        <div className="flex flex-col items-center mb-10">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mb-6 relative"
          >
            <Image
              src="/unnamed.jpg"
              alt="Neurotoned"
              width={56}
              height={56}
              className="rounded-xl object-cover ring-1 ring-primary/30 shadow-2xl shadow-primary/20"
            />
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight text-[#F4F8F5] mb-2 font-heading">
            Neurotoned Workspace
          </h1>
          <p className="text-[14px] text-[#547A63] text-center">
            Sign in to access the resolution center and CRM tools.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[12px] font-semibold tracking-wide text-[#547A63] uppercase ml-1">Username</label>
            <Input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              className="h-12 bg-[#0D1E14]/50 border-[#152218] text-[#F4F8F5] focus-visible:ring-1 focus-visible:ring-primary/50 text-[15px] placeholder:text-[#3A5E48]"
              placeholder="admin"
              autoComplete="username"
              autoFocus
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[12px] font-semibold tracking-wide text-[#547A63] uppercase ml-1">Password</label>
            <Input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="h-12 bg-[#0D1E14]/50 border-[#152218] text-[#F4F8F5] focus-visible:ring-1 focus-visible:ring-primary/50 text-[15px] placeholder:text-[#3A5E48]"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: "auto" }} 
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 text-[13px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-lg mt-2">
                  <Lock className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Button 
            type="submit" 
            disabled={isLoading || !username || !password}
            className="w-full h-12 mt-4 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-[15px] shadow-lg shadow-primary/20 rounded-xl transition-all"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in"}
          </Button>
        </form>
      </motion.div>
    </div>
  )
}
