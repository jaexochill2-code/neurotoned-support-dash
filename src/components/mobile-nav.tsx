"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Library, MessageSquareText, Settings } from "lucide-react"

import { cn } from "@/lib/utils"

export function MobileNav() {
  const pathname = usePathname()

  const navItems = [
    { href: "/",   icon: MessageSquareText, label: "Live" },
    { href: "/kb", icon: Library,           label: "Knowledge" },
    { href: "/crm/concerns", icon: LayoutDashboard, label: "Analytics" },
  ]

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-lg border-t border-border pb-[env(safe-area-inset-bottom)]">
      <nav className="flex items-center justify-around h-16 px-6">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                )}
                <Icon strokeWidth={isActive ? 2.5 : 2} className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
