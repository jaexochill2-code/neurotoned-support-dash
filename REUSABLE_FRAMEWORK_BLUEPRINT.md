# Reusable Next.js AI Dashboard Framework

> **Purpose:** This document captures the exact architectural blueprint used to build the Neurotoned Support Dashboard so that it can be replicated for any future AI-powered CRM, support tool, or internal dashboard.

---

## Architecture Pattern: 3-Layer Stack

```
┌──────────────────────────────────────────────┐
│  LAYER 1 — UI / Pages                        │
│  Next.js App Router + ShadCN/UI + Framer     │
│  Dark theme, responsive, glassmorphism       │
├──────────────────────────────────────────────┤
│  LAYER 2 — API Routes                        │
│  /api/* route handlers (Node.js runtime)     │
│  Cookie auth gate on every sensitive route    │
├──────────────────────────────────────────────┤
│  LAYER 3 — Data + AI                         │
│  Supabase (Postgres) + Google Gemini         │
│  SOPs injected as system prompt context      │
└──────────────────────────────────────────────┘
```

---

## Step-by-Step Replication Guide

### Phase 1: Project Bootstrap

```bash
# 1. Create Next.js app
npx -y create-next-app@latest ./my-dashboard --typescript --tailwind --eslint --app --src-dir

# 2. Install dependencies
npm install @google/generative-ai @supabase/supabase-js framer-motion lucide-react recharts next-themes sonner cmdk date-fns

# 3. Initialize ShadCN/UI
npx shadcn@latest init
npx shadcn@latest add button card dialog input label separator sheet tabs textarea scroll-area badge select sonner command tooltip
```

### Phase 2: Design System Setup

**Fonts** — In `layout.tsx`:
```typescript
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from "next/font/google";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-heading" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
```

**Theme** — Lock to dark mode:
```tsx
<ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
```

**Color Palette** — Define in `globals.css`:
- Background: `hsl(220 20% 4%)` to `hsl(220 15% 8%)`
- Card surfaces: `hsl(220 15% 10%)` with `backdrop-blur`
- Primary accent: Emerald `#10b981`
- Text: `hsl(0 0% 95%)` primary, `hsl(0 0% 60%)` muted

### Phase 3: Layout Shell

**Desktop:** Fixed left sidebar (240px) + scrollable main content area
**Mobile:** Full-width content + fixed bottom navigation bar

```
┌─────────┬──────────────────────────┐
│ Sidebar │                          │
│  Logo   │     Main Content         │
│  Nav    │     (scrollable)         │
│  Links  │                          │
│         │                          │
└─────────┴──────────────────────────┘
          ┌──────────────────────────┐
Mobile:   │ Content                  │
          │                          │
          ├──────────────────────────┤
          │ ◉  ◉  ◉  ◉  Bottom Nav │
          └──────────────────────────┘
```

### Phase 4: Authentication Pattern

**Cookie-based auth WITHOUT middleware** (avoids Next.js edge runtime issues):

1. **`/api/auth` route** — POST accepts `{username, password}`, sets `HttpOnly` cookie on success. GET validates cookie.
2. **`AuthGuard` client component** — Wraps entire app in `layout.tsx`. On mount, calls `GET /api/auth`. If invalid, renders full-screen login UI in-place (no redirect flash).
3. **API route protection** — Every sensitive API route starts with a 3-line cookie check:
   ```typescript
   const token = (await cookies()).get("your_auth_token");
   if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   ```

### Phase 5: AI Integration Pattern

**Two-Pass Reasoning:**
```typescript
const systemPrompt = `
You are [ROLE]. 

INTERNAL REASONING (do not show to user):
1. Identify the customer's core problem
2. List any actions needed (password reset, refund, escalation)
3. Assess emotional state

THEN generate your response following these rules:
${sopsContent}  // <-- Injected from database/filesystem
`;
```

**SOP Injection:** Store operating rules in a JSON file or database table. Load them at API call time and inject into the system prompt. This makes AI behavior configurable without code changes.

### Phase 6: Data Layer Pattern

**Supabase Admin Client:**
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**Local Filesystem Fallback:**
For data that doesn't need a database (SOPs, KB articles during development), use `fs.readFileSync` / `fs.writeFileSync` with a `data/` directory.

### Phase 7: CRM Analytics Pattern

**Interactive Donut Chart with Drill-down:**
- Use Recharts `PieChart` with `activeShape` for hover effects
- Click a slice → filter a data table below
- Color-code by severity/category
- Animate with Framer Motion `AnimatePresence`

---

## Reusable Component Checklist

| Component | Purpose | Reuse Level |
|---|---|---|
| `AuthGuard` | Cookie-based login gate | Drop-in for any app |
| `Sidebar` | Desktop navigation | Customize links only |
| `MobileNav` | Bottom tab bar | Customize icons/links |
| `CommandPalette` | Cmd+K search | Drop-in for any app |
| `ThemeProvider` | Dark/light mode | Drop-in |
| `SeverityBadge` | Color-coded status labels | Customize colors/labels |
| AI Chat Workspace | Textarea → API → streaming response | Customize prompt/API |

---

## Environment Variable Template

```env
# AI
GEMINI_API_KEY=your_google_ai_key

# Auth
ADMIN_PASSWORD=your_password

# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Build (for hosting providers)
NODE_VERSION=20
```

---

## Deployment Checklist

- [ ] All environment variables set in hosting dashboard
- [ ] `.env.local` is in `.gitignore`
- [ ] Git installed locally (`winget install --id Git.Git`)
- [ ] Code pushed to GitHub (`git init → add → commit → push`)
- [ ] Hosting provider connected to GitHub repo
- [ ] Build command: `npm run build`
- [ ] Publish directory: `.next`
- [ ] Test login flow on live URL
- [ ] Test AI generation on live URL
- [ ] Verify all API routes return 401 without auth cookie

---

## Quick-Start for New Projects

```bash
# Clone the framework
git clone https://github.com/YOUR_USERNAME/neurotoned-support-dash.git my-new-dashboard
cd my-new-dashboard

# Swap branding
# 1. Replace public/unnamed.jpg with your logo
# 2. Update layout.tsx metadata (title, description)
# 3. Update sidebar.tsx navigation links
# 4. Update globals.css color variables
# 5. Update auth-guard.tsx branding (logo, title, tagline)

# Configure
cp .env.example .env.local
# Fill in your own API keys

# Launch
npm install
npm run dev
```

---

## Common Patterns Reference

### Adding a New Page
1. Create `src/app/your-page/page.tsx`
2. Add navigation link in `sidebar.tsx` and `mobile-nav.tsx`
3. If it needs data, create `src/app/api/your-endpoint/route.ts`

### Adding a New API Route
1. Create `src/app/api/your-endpoint/route.ts`
2. Add cookie auth check at the top
3. Import `supabaseAdmin` if database access needed

### Modifying AI Behavior
1. Go to Settings page in the app
2. Edit the SOPs text
3. Save — changes take effect on the next AI call (no restart needed)

### Adding a New CRM Category
1. Update the Supabase `crm_concerns` table
2. Add the new category/sub-reasons to `src/app/crm/concerns/page.tsx`
3. Update the donut chart color mapping
