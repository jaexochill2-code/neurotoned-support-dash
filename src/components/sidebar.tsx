"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Library, MessageSquareText } from "lucide-react"

import { cn } from "@/lib/utils"

export function Sidebar() {
  const pathname = usePathname()

  const navItems = [
    { href: "/",   icon: MessageSquareText, label: "Resolution center" },
    { href: "/kb", icon: Library,           label: "Knowledge hub" },
    { href: "/crm/concerns", icon: LayoutDashboard, label: "Analytics" },
  ]

  return (
    <div className="flex h-screen w-60 flex-col bg-sidebar border-r border-sidebar-border text-foreground z-20 hidden md:flex shrink-0">
      <div className="flex items-center gap-3 px-5 py-7 mb-2">
        <div className="relative shrink-0">
          <Image
            src="/unnamed.jpg"
            alt="Neurotoned"
            width={30}
            height={30}
            className="rounded-lg object-cover ring-1 ring-primary/30"
          />
        </div>
        <h1 className="text-[17px] font-bold tracking-tight font-heading">Neurotoned</h1>
      </div>

      <nav className="flex-1 space-y-1.5 px-3">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-all duration-300",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Subtle Active Tint */}
              <div 
                className={cn(
                  "absolute inset-0 rounded-lg bg-primary/10 opacity-0 transition-opacity duration-300 pointer-events-none",
                  isActive ? "opacity-100" : "group-hover:opacity-50"
                )}
              />
              {/* Flush Left Active Indicator */}
              {isActive && (
                <div className="absolute left-[-12px] inset-y-2 w-[3px] bg-primary rounded-r-full pointer-events-none" />
              )}
              
              <Icon 
                strokeWidth={isActive ? 2.5 : 2} 
                className={cn(
                  "h-[18px] w-[18px] relative z-10 transition-transform duration-300",
                  isActive ? "scale-105" : "group-hover:scale-105"
                )} 
              />
              <span className="relative z-10 translate-x-0 group-hover:translate-x-1 transition-transform duration-300">
                {label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
