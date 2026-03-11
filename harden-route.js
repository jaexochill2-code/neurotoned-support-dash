// harden-route.js — post-cleanup hardening sweep
const fs = require('fs');
const path = 'src/app/api/generate/route.ts';
let src = fs.readFileSync(path, 'utf8');
const originalSize = src.length;

let issues = [];

// ── 1. Remove unused WRITING_VOICE constant ───────────────────────────────
const WV_START = '\n// Writing Voice: Brene Brown (The Courage Whisperer) — permanent single voice\n// Chosen for Neurotoned: works across ALL distress levels, de-shames billing/\n// refund anxiety, peer-level warmth, grounded. Best fit for NVC + PEACE protocol.\nconst WRITING_VOICE = `Your writing voice is Brene Brown (The Courage Whisperer).\nLead with vulnerability. Name the hard thing out loud so they don\'t have to.\nDe-shame everything. There is nothing wrong with you for feeling this way.\nPeer-level warmth. You are walking beside them, not above them.\nMedium sentences. Grounded, never flowery. Courage over comfort, but always kind.`;';
const wvIdx = src.indexOf(WV_START);
if (wvIdx !== -1) {
  // Also check it's not referenced elsewhere
  const wvRefs = (src.match(/WRITING_VOICE/g) || []).length;
  if (wvRefs === 1) {
    src = src.replace(WV_START, '');
    issues.push('OK: Removed unused WRITING_VOICE constant');
  } else {
    issues.push(`INFO: WRITING_VOICE has ${wvRefs} refs — keeping`);
  }
} else {
  issues.push('INFO: WRITING_VOICE not found or already removed');
}

// ── 2. Collapse excessive blank lines in sanitizer section ────────────────
// Multiple blank lines (3+) left over from removed phases
const beforeBlanks = src.length;
src = src.replace(/\n{4,}/g, '\n\n\n'); // max 3 consecutive newlines
if (src.length !== beforeBlanks) issues.push('OK: Collapsed excessive blank lines');

// ── 3. Remove orphaned comment: "// ── Persona ──" ────────────────────────
const PERSONA_COMMENT = '\r\n    // ── Persona ──────────────────────────────────────────────────────────────\r\n';
if (src.includes(PERSONA_COMMENT)) {
  src = src.replace(PERSONA_COMMENT, '\r\n');
  issues.push('OK: Removed orphaned persona comment');
}

// ── 4. Verify kbContext injection is live ─────────────────────────────────
if (src.includes('${kbContext}')) {
  issues.push('OK: kbContext injection confirmed');
} else {
  issues.push('WARN: kbContext injection NOT FOUND — check system prompt');
}

// ── 5. Verify EXCLUDED_BINS gate is present ───────────────────────────────
if (src.includes('EXCLUDED_BINS')) {
  issues.push('OK: Server-side EXCLUDED_BINS gate present');
} else {
  issues.push('WARN: EXCLUDED_BINS gate missing');
}

// ── 6. Verify Phase 0 (greeting split) is present ────────────────────────
if (src.includes('Phase 0: Ensure greeting')) {
  issues.push('OK: Phase 0 greeting split present');
} else {
  issues.push('WARN: Phase 0 missing');
}

// ── 7. Verify Phase 4 (paragraph normalization) is present ───────────────
if (src.includes('Phase 4: Paragraph normalization')) {
  issues.push('OK: Phase 4 normalization present');
} else {
  issues.push('WARN: Phase 4 missing');
}

// ── 8. Verify Phase 5 (punctuation repair) is present ─────────────────────
if (src.includes('Phase 5: Punctuation repair')) {
  issues.push('OK: Phase 5 punctuation repair present');
} else {
  issues.push('WARN: Phase 5 missing');
}

// ── 9. Verify email length guard ─────────────────────────────────────────
if (src.includes('MAX_EMAIL_LENGTH')) {
  issues.push('OK: Email length guard present');
} else {
  issues.push('WARN: Email length guard missing');
}

// ── 10. Verify retry logic ────────────────────────────────────────────────
if (src.includes('attempt = 0')) {
  issues.push('OK: Retry logic present');
} else {
  issues.push('WARN: Retry logic missing');
}

// ── 11. Verify export maxDuration ─────────────────────────────────────────
if (src.includes('export const maxDuration = 60')) {
  issues.push('OK: maxDuration = 60 set (Vercel timeout)');
} else {
  issues.push('WARN: maxDuration not found');
}

// ── 12. Check for any remaining WHITELIST string (should be in prompt, not code)
const wlCount = (src.match(/WHITELIST/g) || []).length;
issues.push(`INFO: WHITELIST references: ${wlCount} (should be 1 — in the prompt text only)`);

// ── 13. Check for any leftover Phase labels that were supposed to be removed
['Phase 1: Safe word-for-word', 'Phase 2: Standalone', 'Phase 3: Full-clause', 'Phase 4.5', 'Phase 5.5'].forEach(p => {
  if (src.includes(p)) issues.push(`WARN: Dead phase still present — "${p}"`);
  else issues.push(`OK: Dead phase absent — "${p}"`);
});

fs.writeFileSync(path, src, 'utf8');

console.log('=== HARDENING AUDIT ===');
console.log(`  Original: ${originalSize} bytes → Final: ${src.length} bytes (delta: ${originalSize - src.length})`);
console.log('');
issues.forEach(i => console.log(' ', i));
