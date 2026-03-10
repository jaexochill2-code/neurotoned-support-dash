import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from "next/font/google";
import Image from "next/image";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Toaster } from "@/components/ui/sonner";
import { CommandPalette } from "@/components/command-palette";
import { AnnouncementProvider } from "@/components/announcement-provider";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Neurotoned | Resolution Center",
  description: "Customer support resolution and team guidelines.",
  icons: {
    icon: '/unnamed.jpg',
    shortcut: '/unnamed.jpg',
    apple: '/unnamed.jpg',
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { AuthGuard } from "@/components/auth-guard";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(dmSans.variable, bricolage.variable, jetbrainsMono.variable)}>
      <body className="font-sans antialiased text-foreground bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <AuthGuard>
            <AnnouncementProvider>
              <div className="flex h-[100dvh] overflow-hidden selection:bg-primary/20 selection:text-primary relative dark:bg-background pt-[env(safe-area-inset-top)]">
                <Sidebar />
                <main className="flex-1 flex flex-col h-full overflow-y-auto p-4 md:p-8 pb-20 md:pb-8 relative z-10 w-full">
                  {/* Mobile-only logo strip */}
                  <div className="md:hidden flex items-center gap-3 px-1 pb-4 pt-1 shrink-0">
                  <Image src="/unnamed.jpg" alt="Neurotoned Logo" width={32} height={32}
                    className="h-8 w-8 rounded-[8px] object-cover ring-1 ring-border shadow-sm" />
                  <span className="text-[17px] font-bold tracking-tight font-heading mt-0.5">Neurotoned</span>
                </div>
                
                  {children}
                </main>
                <MobileNav />
              </div>
            </AnnouncementProvider>
          </AuthGuard>
          <CommandPalette />
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
