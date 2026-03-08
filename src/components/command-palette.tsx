"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Calculator, Calendar, CreditCard, Settings, Smile, User, FileText, Search } from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"

type KBFile = {
  id: string
  title: string
  category: string
  brand: string
}

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [files, setFiles] = React.useState<KBFile[]>([])
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  React.useEffect(() => {
    if (!open) return
    // Fetch docs when opened
    fetch("/api/kb")
      .then(res => res.json())
      .then(data => {
        if (data.files) setFiles(data.files)
      })
      .catch(() => {})
  }, [open])

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search SOPs..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {files.length > 0 && (
          <CommandGroup heading="Knowledge Base Docs">
            {files.map(file => (
              <CommandItem
                key={file.id}
                value={`${file.title} ${file.category} ${file.brand}`}
                onSelect={() => {
                  runCommand(() => router.push(`/kb`))
                  // We would ideally select the specific document here via query param if we had it rigged
                }}
              >
                <FileText className="mr-2 h-4 w-4 text-primary opacity-70" />
                <span>{file.title}</span>
                <span className="ml-auto text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2 rounded-md">
                  {file.category}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
            <Search className="mr-2 h-4 w-4" />
            <span>Resolution Center</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/kb"))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Knowledge Hub</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
