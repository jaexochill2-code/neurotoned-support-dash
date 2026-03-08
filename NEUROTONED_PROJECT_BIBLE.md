# Neurotoned Support Dashboard — Complete Project Bible

> **Last Updated:** March 8, 2026  
> **Status:** Feature-complete, pending deployment  
> **Stack:** Next.js 16.1.6 · React 19 · Tailwind CSS 4 · ShadCN/UI · Supabase · Google Gemini AI

---

## 1. What This App Is

A premium, dark-themed internal CRM and AI-powered customer support dashboard for Neurotoned. It includes:

- **Resolution Center** (AI Chat) — A workspace where support agents paste customer emails and the AI generates empathetic, trauma-informed responses using Gemini, guided by custom SOPs.
- **Knowledge Hub (KB)** — A searchable library of curated articles (stored in Supabase) that agents can reference.
- **CRM Module** — Customer concern tracking with severity badges, status management, and Recharts-powered analytics (interactive donut chart with drill-down).
- **Settings Panel** — Global AI behavior rules (SOPs) editor.
- **Login Screen** — Cookie-based authentication (`admin` / `password`) protecting all routes and API endpoints.

---

## 2. Complete File Tree

```
Neurotoned Support Dash/
├── .env.local                    # API keys & secrets (NEVER commit this)
├── .gitignore                    # Ignores node_modules, .env*, .next, etc.
├── package.json                  # Dependencies & scripts
├── next.config.ts                # Next.js configuration
├── tsconfig.json                 # TypeScript config
├── postcss.config.mjs            # PostCSS (Tailwind)
├── components.json               # ShadCN/UI configuration
├── eslint.config.mjs             # ESLint rules
│
├── public/
│   └── unnamed.jpg               # Neurotoned logo (used in sidebar + login + favicon)
│
├── data/
│   ├── sops.json                 # Fallback SOPs file (filesystem-based)
│   └── kb/                       # Local KB article JSON files
│
├── src/
│   ├── lib/
│   │   ├── utils.ts              # cn() utility (clsx + tailwind-merge)
│   │   └── supabase-admin.ts     # Supabase service role client
│   │
│   ├── components/
│   │   ├── auth-guard.tsx        # Global login gate (wraps entire app)
│   │   ├── sidebar.tsx           # Desktop sidebar navigation
│   │   ├── mobile-nav.tsx        # Mobile bottom navigation bar
│   │   ├── command-palette.tsx   # Cmd+K command palette
│   │   ├── theme-provider.tsx    # Dark mode provider (locked to dark)
│   │   ├── theme-toggle.tsx      # Theme toggle button
│   │   ├── ui/                   # ShadCN/UI primitives (button, card, dialog, etc.)
│   │   └── crm/                  # CRM-specific components
│   │       ├── severity-badge.tsx
│   │       └── status-badge.tsx
│   │
│   └── app/
│       ├── layout.tsx            # Root layout (fonts, AuthGuard, sidebar, toaster)
│       ├── page.tsx              # Resolution Center (main AI chat workspace)
│       ├── globals.css           # Global styles + Tailwind + custom properties
│       ├── favicon.ico
│       │
│       ├── kb/
│       │   └── page.tsx          # Knowledge Hub (search + article cards)
│       │
│       ├── settings/
│       │   └── page.tsx          # Settings (SOP editor)
│       │
│       ├── crm/
│       │   ├── concerns/
│       │   │   ├── page.tsx      # CRM concerns list (data table)
│       │   │   └── [id]/
│       │   │       └── page.tsx  # Individual concern workspace
│       │   └── settings/
│       │       └── page.tsx      # CRM settings page
│       │
│       └── api/
│           ├── auth/
│           │   └── route.ts      # POST: Login (username+password → cookie)
│           │                     # GET: Session check (cookie validation)
│           ├── generate/
│           │   └── route.ts      # POST: Gemini AI response generation
│           ├── sops/
│           │   └── route.ts      # GET/POST: Global AI rules (SOPs)
│           ├── kb/
│           │   └── route.ts      # GET/POST/DELETE: Knowledge Base CRUD
│           ├── crm/
│           │   ├── analytics/
│           │   │   └── route.ts  # GET: CRM analytics data
│           │   ├── concerns/
│           │   │   ├── route.ts  # GET: All concerns
│           │   │   └── [id]/
│           │   │       └── route.ts  # GET/PATCH: Single concern
│           │   ├── generate/
│           │   │   └── route.ts  # POST: CRM-specific AI generation
│           │   └── settings/
│           │       └── route.ts  # GET/POST: CRM settings
│           └── test-env/
│               └── route.ts      # Debug: Environment variable tester
```

---

## 3. Environment Variables

These must be set in `.env.local` (local dev) AND in your hosting provider's dashboard (production):

| Variable | Value | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | `AIzaSy...` | Google Generative AI API key |
| `ADMIN_PASSWORD` | `password` | Login password (hardcoded override in code) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://zjsn...supabase.co` | Supabase project URL |
| `SUPABASE_ANON_KEY` | `sb_publishable_...` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | Supabase admin key (server-side only) |
| `NODE_VERSION` | `20` | Required for Netlify/Vercel builds |

---

## 4. Authentication System

- **Credentials:** `username: admin` / `password: password` (hardcoded in `/api/auth/route.ts`)
- **Mechanism:** On successful login, a `neurotoned_admin_token` cookie is set with a 7-day expiry
- **Guard:** The `AuthGuard` component in `layout.tsx` checks for this cookie on every page load
- **API Protection:** All sensitive API routes (`/api/generate`, `/api/sops`, `/api/crm/*`) verify the cookie before processing

---

## 5. Design System — "Clinical Calm"

| Element | Value |
|---|---|
| **Primary Font** | Bricolage Grotesque (headings) |
| **Body Font** | DM Sans (all body text) |
| **Mono Font** | JetBrains Mono (code/data) |
| **Theme** | Locked dark mode |
| **Primary Color** | Emerald green (`#10b981` / Tailwind `emerald-500`) |
| **Background** | Near-black with subtle gradients |
| **Cards** | Glassmorphism with `backdrop-blur` and `ring-1 ring-border` |
| **Animations** | Framer Motion (fade-in, slide-up, stagger) |
| **Logo** | `/public/unnamed.jpg` — used in sidebar, mobile header, login screen, favicon |

---

## 6. AI Architecture

### Prompt Engineering
The AI uses a **two-pass reasoning system**:
1. **First Pass (Internal):** Identifies implied problems, required actions (password resets, escalations), and emotional tone
2. **Second Pass (Response):** Generates a trauma-informed, empathetic customer reply incorporating the first-pass insights

### SOPs (Standard Operating Procedures)
- Stored in `data/sops.json` (filesystem fallback)
- Editable via the Settings page
- Injected into every Gemini API call as system context
- Controls: tone, escalation triggers, refund policies, greeting style

### Model
- Google Gemini (`@google/generative-ai` SDK)
- Called via `POST /api/generate`

---

## 7. Database (Supabase)

### Tables
- `kb_articles` — Knowledge Hub articles (title, content, category, tags)
- `crm_concerns` — Customer concerns (subject, category, sub_reason, severity, status, notes)

### Concern Taxonomy (2-tier)
| Category | Sub-reasons |
|---|---|
| Refunds | Unauthorized charge, Product not as described, Duplicate charge |
| Product Fit | Wrong size/model, Missing features, Compatibility issue |
| UX/App | App crash, Login issues, Slow performance |
| Billing | Subscription confusion, Price discrepancy, Payment failed |
| Shipping | Delayed, Lost package, Wrong item |

---

## 8. Key npm Scripts

```bash
npm run dev          # Start local dev server (localhost:3000 or 3001)
npm run build        # Production build
npm run start        # Serve production build locally
npm run deploy       # Build + deploy to hosting
```

---

## 9. Deployment Guide

### Prerequisites
1. Git installed on your machine (`winget install --id Git.Git -e --source winget`)
2. A GitHub account
3. A Vercel OR Netlify account

### Step-by-Step (Vercel — Recommended for Next.js)

1. **Push to GitHub:**
   ```bash
   cd "C:\Users\Tax Filing\Desktop\App Research\Neurotoned Support Dash"
   git init
   git add .
   git commit -m "Initial production build"
   git branch -M main
   git remote add origin https://github.com/jaexochill2-code/neurotoned-support-dash.git
   git push -u origin main
   ```

2. **Connect Vercel:**
   - Go to [vercel.com](https://vercel.com) → Add New Project → Import Git Repository
   - Select `neurotoned-support-dash`
   - Add environment variables: `GEMINI_API_KEY`, `ADMIN_PASSWORD`, `NODE_VERSION=20`, and the Supabase keys
   - Click Deploy

3. **Future Updates (Real-time editing):**
   ```bash
   git add .
   git commit -m "describe your change"
   git push
   ```
   Vercel automatically rebuilds and deploys within ~60 seconds.

### Step-by-Step (Netlify — Alternative)
- Same GitHub push process
- Import from Git in Netlify dashboard
- Set Build command: `npm run build`, Publish directory: `.next`
- Add same environment variables

---

## 10. Known Gotchas & Troubleshooting

| Issue | Fix |
|---|---|
| Port 3000 already in use | Run `taskkill /F /IM node.exe` then retry `npm run dev` |
| `.env.local` not loading | Restart the dev server completely (Ctrl+C → `npm run dev`) |
| Login doesn't work | Clear cookies, ensure you're using `admin` / `password` |
| Netlify "Failed publishing static content" | Known Windows + Next 15 CLI bug. Use Vercel or GitHub-connected deploy instead |
| Supabase returns empty data | Check that `SUPABASE_SERVICE_ROLE_KEY` is set and the table exists |
| `git` not recognized | Restart your computer after installing Git |
| Dev server lock file error | Run `taskkill /F /IM node.exe` to kill ghost processes |

---

## 11. Security Notes

- `.env.local` is in `.gitignore` — your API keys will NEVER be pushed to GitHub
- All API routes are protected by cookie authentication
- The login credentials are hardcoded for demo/internal use
- For production with real users, replace the hardcoded check with a proper auth provider (NextAuth, Clerk, etc.)

---

## 12. Dependencies

### Production
| Package | Purpose |
|---|---|
| `next` 16.1.6 | React framework |
| `react` / `react-dom` 19.2.3 | UI library |
| `@google/generative-ai` | Gemini AI SDK |
| `@supabase/supabase-js` | Database client |
| `framer-motion` | Animations |
| `recharts` | Charts (CRM analytics) |
| `lucide-react` | Icon library |
| `sonner` | Toast notifications |
| `next-themes` | Theme management |
| `shadcn` + `class-variance-authority` + `clsx` + `tailwind-merge` | UI component system |
| `cmdk` | Command palette |
| `date-fns` | Date formatting |

### Dev
| Package | Purpose |
|---|---|
| `tailwindcss` v4 | CSS framework |
| `@tailwindcss/postcss` | PostCSS plugin |
| `typescript` v5 | Type safety |
| `eslint` + `eslint-config-next` | Linting |
