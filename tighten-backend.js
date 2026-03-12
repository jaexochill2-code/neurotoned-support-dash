// tighten-backend.js — targeted backend tightening (no breaking changes)
const fs = require('fs');

let issues = [];

// ═══════════════════════════════════════════════════════════════
// 1. GENERATE ROUTE — agentContext guard + analytics in response
//    + indentation fixes + CRM error visibility
// ═══════════════════════════════════════════════════════════════
{
  const path = 'src/app/api/generate/route.ts';
  let src = fs.readFileSync(path, 'utf8');

  // 1a. Add agentContext length guard
  const AGENT_GUARD_ANCHOR = '    const { email, agentContext } = await req.json();\r\n';
  const AGENT_GUARD_REPLACEMENT = '    const { email, agentContext } = await req.json();\r\n\r\n    if (agentContext && typeof agentContext === "string" && agentContext.length > 5000) {\r\n      return NextResponse.json({ error: "Agent context is too long." }, { status: 400 });\r\n    }\r\n';
  if (src.includes(AGENT_GUARD_ANCHOR) && !src.includes('agentContext.length > 5000')) {
    src = src.replace(AGENT_GUARD_ANCHOR, AGENT_GUARD_REPLACEMENT);
    issues.push('OK [Generate]: agentContext length guard added');
  } else {
    issues.push('SKIP [Generate]: agentContext guard already present or anchor not found');
  }

  // 1b. Return analytics in the response (frontend can use immediately)
  const OLD_RETURN = '    return NextResponse.json({ response: finalReply });';
  const NEW_RETURN = `    return NextResponse.json({
      response: finalReply,
      concern_bin: parsedData.analytics?.concern_bin ?? null,
      urgency: parsedData.analytics?.urgency ?? null,
      churn_risk: parsedData.analytics?.churn_risk ?? null,
    });`;
  if (src.includes(OLD_RETURN)) {
    src = src.replace(OLD_RETURN, NEW_RETURN);
    issues.push('OK [Generate]: analytics fields returned in response');
  } else {
    issues.push('SKIP [Generate]: return already modified or not found');
  }

  // 1c. Fix indentation inconsistencies (Phase 5 and Extract Reply comments)
  src = src.replace('\n// Phase 5: Punctuation repair after all removals', '\n    // Phase 5: Punctuation repair after all removals');
  src = src.replace('\n// ── Extract Reply ────────────────────────────────────────────────────────\r\n', '\r\n    // ── Extract Reply ────────────────────────────────────────────────────────\r\n');
  issues.push('OK [Generate]: indentation fixes applied');

  // 1d. CRM fire-and-forget — add log on failure (was silent catch)
  const OLD_CRM_CATCH = "      saveToCrm(parsedData.analytics, email).catch(() => {});";
  const NEW_CRM_CATCH = "      saveToCrm(parsedData.analytics, email).catch((e) => console.error('[CRM] Fire-and-forget failed:', e));";
  if (src.includes(OLD_CRM_CATCH)) {
    src = src.replace(OLD_CRM_CATCH, NEW_CRM_CATCH);
    issues.push('OK [Generate]: CRM failure now logged');
  }

  // 1e. Remove an extra blank line
  src = src.replace(/\n{3,}/g, '\n\n');

  fs.writeFileSync(path, src, 'utf8');
  issues.push(`OK [Generate]: saved (${src.length} bytes)`);
}

// ═══════════════════════════════════════════════════════════════
// 2. AUTH ROUTE — remove "password" hardcoded fallback
// ═══════════════════════════════════════════════════════════════
{
  const path = 'src/app/api/auth/route.ts';
  let src = fs.readFileSync(path, 'utf8');

  const OLD_PW = 'const adminPassword = process.env.ADMIN_PASSWORD || "password";';
  const NEW_PW = `if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
    }
    const adminPassword = process.env.ADMIN_PASSWORD;`;
  if (src.includes(OLD_PW)) {
    src = src.replace(OLD_PW, NEW_PW);
    issues.push('OK [Auth]: Removed "password" hardcoded fallback — throws 500 if ADMIN_PASSWORD not set');
  } else {
    issues.push('SKIP [Auth]: fallback already removed or anchor not found');
  }

  fs.writeFileSync(path, src, 'utf8');
  issues.push(`OK [Auth]: saved (${src.length} bytes)`);
}

// ═══════════════════════════════════════════════════════════════
// 3. KB ROUTE — content size limit + .md extension enforcement
// ═══════════════════════════════════════════════════════════════
{
  const path = 'src/app/api/kb/route.ts';
  let src = fs.readFileSync(path, 'utf8');

  const OLD_KB_VALIDATION = '    if (!title || content === undefined) {\n      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });\n    }';
  const NEW_KB_VALIDATION = `    if (!title || content === undefined) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
    }
    if (typeof content === "string" && content.length > 100_000) {
      return NextResponse.json({ error: "KB file content is too large (max 100KB)." }, { status: 400 });
    }
    if (typeof title === "string" && title.length > 200) {
      return NextResponse.json({ error: "Title is too long (max 200 chars)." }, { status: 400 });
    }`;
  if (src.includes(OLD_KB_VALIDATION)) {
    src = src.replace(OLD_KB_VALIDATION, NEW_KB_VALIDATION);
    issues.push('OK [KB]: Content size limit (100KB) and title length (200 chars) guards added');
  } else {
    issues.push('SKIP [KB]: validation anchor not found');
  }

  fs.writeFileSync(path, src, 'utf8');
  issues.push(`OK [KB]: saved (${src.length} bytes)`);
}

// ═══════════════════════════════════════════════════════════════
// REPORT
// ═══════════════════════════════════════════════════════════════
console.log('\n=== BACKEND TIGHTENING REPORT ===\n');
issues.forEach(i => console.log('  ' + i));
