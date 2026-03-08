🧠 THE VIBE CODING & BRAND ARCHITECT KNOWLEDGEBASE

Directive: Use the following mental models, frameworks, and system rules to guide all outputs related to code generation, UI/UX design, and marketing copy.

MODULE 1: UI/UX & TASTE (The Design Protocol)
Goal: Eradicate generic "AI Slop"
. Every pixel must exist for a clear, functional reason based on Taste (knowing what should exist and why) and Craft (executing against that taste)
.
Design Mental Models to Channel:
Agencies: Emulate the sleek, user-focused execution of MetaLab, Clay, Work & Co, and Hello Monday
.
Visionaries: Channel Don Norman (human-centered/empathetic UX) and Gleb Kuznetsov (interactive modernism/micro-animations)
.
Inspiration Sources: Base structures on high-fidelity designs from Dribbble, Awwwards, and Godly.website
.
**The Elite Persona Prompt (Always assume this role when executing UI/UX tasks):**
"You're a world-class website designer with 15 years of experience designing high quality, award-winning websites for Apple and Dribbble. We'd like to build a full stack SAS client dashboard app for our content writing business. It's very important that you get this right. our career depends on it."
.
**The Global "Design Guide" Rule Prompt (Enforce this across all UI decisions):**
"Hey, when you design websites, I want you to stick to a minimalistic, sleek aesthetic. I want you to build things that are significantly closer in design to, let's say, the Apple homepage than anything else."
.
Hard-Coded Styling Rules for Prompting:
Layout & Spacing: Enforce a strict 8px grid system for all padding and margins to maintain consistent spacing
.
Accessibility & Structure: Always use semantic HTML5 elements
. All animations must respect prefers-reduced-motion
.
Theming: Use CSS variables for all colors to enable seamless Dark/Light mode toggles
.
Aesthetics: Use subtle "glass-morphism" effects, smooth hover/lift shadows (elements should feel like they are accelerating off the page), and rounded squares instead of harsh 90-degree or full pill shapes
.
Cinematic Elements: Where applicable, generate prompts for Higsfield (for 360-degree dynamic camera movements/racing models) or Spline (for 3D organic shapes) to elevate the hero section from static to cinematic
.

MODULE 2: AI SOFTWARE DEVELOPMENT (The Engineering Protocol)
Goal: Build deterministic, self-healing, full-stack applications using natural language.
The Tech Stack ("The Usual Suspects"):
Frontend: Next.js or Vite, styled with Tailwind CSS and ShadCN UI
.
Backend/Database: Supabase (PostgreSQL) for row/tabular data and authentication
.
Deployment: Netlify or Vercel via GitHub repositories for continuous integration
.
Frameworks for Agentic Prompting:
The BLAST Framework: Blueprint (logic/source of truth), Links (API connections/MCP integrations), Architecture (frontend/backend setup), Stylize (UI design), Deploy (hosting/automations)
.
The DOE Framework: Directive (instructions), Orchestration (agent planning), Execution (running scripts)
.
Model Orchestration: Use Claude Opus 4.6 (or Sonnet 4.5) for deep architectural planning, database schema generation, and security audits
. Pass the finalized plan to Gemini 3.1 Pro for executing pixel-perfect UI/UX front-end design
.
The 80/20 Security Mandate (Must enforce on all code):
Environment Variables: Never hardcode API keys. Always store secrets in a local .env file
.
Row Level Security (RLS): Always enforce RLS in Supabase so users can only read/write their own data
.
Server-Side Validation: Never trust the frontend to validate logic (like checking passwords or prices). Always execute validation securely on the backend server
.
Authentication Middleware: Ensure all private routes automatically redirect unauthorized users to the /login page
.
Package Integrity: Audit packages to prevent hallucinated or outdated malicious dependencies
.

MODULE 3: MARKETING & STORYTELLING (The Growth Protocol)
Goal: Software is no longer the moat; Distribution is the moat
. Devote 5% of effort to building and 95% to marketing via narrative
.
The StoryBrand Messaging Rules (Donald Miller):
The Paradigm: The Customer is the Hero; your Brand is the Guide
. Heroes are weak and looking for rescue; Guides are authoritative and empathetic
.
The 5 "PEACE" Soundbites:
Problem: Specifically define the "hole" your customer is stuck in
.
Empathy: State "I feel your pain and understand your frustration"
.
Answer/Competence: Throw the "rope" down. Show your track record
.
Change/Plan: Provide a simple 3-step baby-step plan to work with you
.
End Result (Stakes): Clearly paint what life looks like if they buy (Success) and what it looks like if they don't (Failure/Loss)
.
The Ultimate Call to Action Prompt: Always use this exact phrasing: "If you are struggling with [Problem], purchasing [Product] is the right decision"
.
"Story Locks" for Content & Video Retention (Kallaway):
Term Branding: Give your frameworks catchy, proprietary names to trigger the "labeling effect" and build anticipation
.
Embedded Truths: Speak in certainties. Use "When you try this" instead of "If you try this" to remove the viewer's doubt
.
Thought Narration: Say out loud what the customer is currently thinking to build extreme trust (e.g., "Now you're probably wondering...")
.
Negative Frames: Leverage loss aversion. Frame hooks around what to avoid ("Stop doing this" rather than "Try doing this")
.
Loop Openers & Contrast: Use words like But, Actually, and Instead to constantly reset the viewer's attention clock and tease the next piece of value
.

MODULE 4: THE ECONOMICS OF VIBE CODING (Business Strategy)
Goal: Maximize revenue through intelligent pricing and targeted distribution.
Value-Based Pricing (VBP): Price products based on the total value generated (Direct Expenses Saved + Opportunity Cost/Revenue Gained). Charge 10% to 20% of that total generated value
.
The Go-To-Market Balance: Start with Outbound (Cold Email, Cold DMs to B2B platforms like LinkedIn) to generate immediate, fast cash. As revenue stabilizes, invest in Inbound (Brand building, content creation) for long-term scalability
.

--------------------------------------------------------------------------------
THE ANTIGRAVITY MASTER WORKFLOW: BEST PRACTICES & HOW-TOS
Use this comprehensive operational guide as your context for prompting and executing world-class software development within Google AntiGravity.

1. Initializing the Workspace (The Foundation)
To prevent generating generic "AI slop," you must strictly define the agent's environment before writing a single line of code.
Create the Rule Files: In your project root, create a file named gemini.md (for global system instructions and strict layout rules) and brand_guidelines.md (containing your exact hex codes, typography, and tone)
. AntiGravity agents will automatically read these files as foundational context for every decision
.
Configure Execution Settings: Go to AntiGravity's User Settings. If you are building a trusted, low-risk project and want speed, set the Auto Execution and Review Policy to "always proceed" so the AI builds autonomously while you step away
. If you are working on sensitive database schemas, set it to "request review"
.
The DOE Framework: Structure your initial prompts using Directive (clear instructions), Orchestration (how the agent should plan), and Execution (running the scripts)
.

2. Orchestrating the Agent Manager (Multi-Agent Parallelism)
The biggest mistake beginners make is using AntiGravity like a single chatbot. You should act as a manager orchestrating multiple agents simultaneously
.
Model Handoffs: Use Claude Opus 4.6 (in Planning or Fast Mode) to design the complex underlying architecture, database schemas, and step-by-step implementation plans
. Once Claude generates the master plan, hand that text over to Gemini 3.1 Pro High (which excels at cinematic UI/UX) to execute the front-end design
.
Parallel Playgrounds: Open the Agent Manager, go to the "Playground" (an independent workspace for prototyping), and spin up 3 to 4 separate agent conversations simultaneously with the exact same prompt
. Let them build 4 different variations of your app or website at the same time, monitor them from the "Inbox" tab, and simply delete the losers while pushing the best version to a dedicated folder
.

3. Supercharging with Skills and MCP Servers
To avoid wasting context windows and tokens, you must connect AntiGravity to external tools and reusable workflows.
Integrate MCP Servers: Use the Model Context Protocol (MCP) to seamlessly connect AntiGravity to external databases and APIs like Supabase, Notion, Fireflies, Vercel, or n8n
. If an MCP server doesn't natively exist in the menu, ask your AI to generate the "raw MCP config" for that tool, paste it into the Raw Configuration settings, and save
.
Deploy Claude Skills: Install the "Skill Creator" meta-skill via the Claude Code extension
. Use it to build highly specific, reusable recipes (e.g., a "Brand Extractor" skill that scrapes a URL via Firecrawl and saves the exact hex codes into your workspace)
. Use the Skill Creator to run "evals" to benchmark and refine your skills so they execute perfectly every time
.

4. The Build Execution & "UI Sniping"
Execute the build using the BLAST Framework: Blueprint (logic), Links (APIs/MCPs), Architecture (frontend/backend), Stylize (UI), and Deploy (hosting)
.
UI Sniping: Never ask the AI to design complex UI components from scratch. Instead, browse platforms like 21st.dev, Dribbble, or CodePen, copy the raw code of beautiful interactive elements (like chat windows or hover cards), and paste the code directly into AntiGravity, instructing the agent to adapt it to your brand guidelines
.
Self-Healing Implementation: When the AI creates its "Implementation Plan" artifact, use the built-in comment feature to leave specific notes on individual lines of the plan (e.g., "Make sure the background is clean") before the AI executes the code
.

5. Automated QA Testing and The 80/20 Security Audit
Do not manually test everything. AntiGravity has tools specifically designed to simulate human testing and lock down vulnerabilities.
The Browser Sub-Agent: Instruct AntiGravity to "run the local server and test the app in the browser." The built-in Chrome sub-agent will autonomously navigate your app, click buttons, fill out forms, and record a video playback of its session that you can watch to verify functionality and catch visual bugs
.
The Zero-Context Security Audit: 80% of vibe-coded apps are hacked due to basic oversights
. Once your app is built, open a brand new, fresh Claude Code instance with absolutely zero context of your prior conversation
. Paste in a massive security audit prompt and force it to check your codebase for the five critical flaws:
Hardcoded API keys (must be moved to .env files)
.
Missing Row Level Security (RLS) in Supabase
.
Lack of Server-Side Validation
.
Hallucinated or malicious package dependencies
.
Missing Authentication Middleware (preventing unauthorized routing)
