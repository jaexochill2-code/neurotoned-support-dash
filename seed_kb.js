const fs = require('fs');
const path = require('path');

const kbDir = path.join(process.cwd(), 'data', 'kb');

function buildFrontmatter(meta) {
  const lines = Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join('\n');
  return `---\n${lines}\n---\n`;
}

// ── 1. LOGINS & PASSWORDS (single consolidated file) ──────────────────────
const loginsContent = buildFrontmatter({
  title: 'All Logins & Passwords',
  category: 'Logins & Passwords',
  brand: 'All',
}) + `## Serotoned
- Support Email: support@serotoned.com / Password: BamaBitches
- Instagram: @serotoned01 / Password: AlabamaApples

## Neurotoned
- Support Email: support@neurotoned.com
- Instagram: @neurotoned

## Aya Caps
- Support Email: support@tryayacaps.com

## FlowRegen
- Website: flowregen.com

## Noctiflo
- Website: noctiflo.com
`;
fs.writeFileSync(path.join(kbDir, 'all-logins.md'), loginsContent);
console.log('✓ Wrote: All Logins & Passwords');

// ── 2. PRODUCT INFO: Serotoned ────────────────────────────────────────────
const serotonerProductContent = buildFrontmatter({
  title: 'Serotoned — Product Info',
  category: 'Product Info',
  brand: 'Serotoned',
}) + `## Sero (Serotoned-02)
Daily mood + emotional balance support. Natural alternative to anxiety meds (NOT Xanax).
- Vitamin D3 – 15 mcg
- Vitamin B6 (P-5-P) – 8 mg
- Magnesium (DiMag®) – 40 mg
- Zinc (Albion®) – 10 mg
- Omega-3 DHA (Algae) – 160 mg
- Rhodiola Rosea – 50 mg
- L-Theanine – 50 mg
- Saffron Extract 4:1 – 30 mg
- Chamomile Flower – 25 mg
- Lemon Balm – 25 mg
- Lithium Orotate – 5 mg (nutritional, NOT prescription lithium)
- BioPerine® – 5 mg
No Ashwagandha or St. John's Wort in current formula.

## Melo
Nighttime nervous system reset + deep sleep support.
- Magnesium Glycinate, L-Theanine, Lemon Balm, Chamomile, GABA, 5-HTP, Melatonin (microdose)
Supports body's natural sleep rhythm. Never say it "treats insomnia."

## How Long Until Effects?
Effects vary by physiology. Some feel within hours, others 1–3 weeks. Consistency is key.
Best practice: take daily at the same time. Builds stress resilience over time.

## About Lithium Orotate
5 mg nutritional lithium orotate. NOT the same as prescription lithium carbonate (used at much higher doses for clinical conditions). Advise consulting HCP if on medications.

## Safe Language
✅ "Supports mood balance", "may help with calm", "many customers report"
🚫 NEVER: "Treats anxiety/depression", "fixes serotonin", "replaces therapy/medication"

## Business Status
Serotoned is CLOSING once remaining inventory (~400 bottles) sells out. Active subscriptions ship normally until stock runs out. Stock-up deals: 6 bottles $99, 12 bottles $129.
`;
fs.writeFileSync(path.join(kbDir, 'serotoned-product-info.md'), serotonerProductContent);
console.log('✓ Wrote: Serotoned Product Info');

// ── 3. PRODUCT INFO: Neurotoned ───────────────────────────────────────────
const neurotonedProductContent = buildFrontmatter({
  title: 'Neurotoned — Product Info',
  category: 'Product Info',
  brand: 'Neurotoned',
}) + `## Current Offers
- 30 Day Neurotoned Program — $70 (often $29 promo). Self-paced, lifetime access. 60+ videos. Vagus nerve, breathwork, somatic tools.
- Healing Circles — $15/month after 14-day free trial. Live biweekly sessions + recordings.
- Neurotoned Monthly Subscription — $15/month after 30-day free trial. Replacing Healing Circles end of May.
- The Neurotoned Journal — $21 (often $7 promo). PDF download via Kajabi. NON-REFUNDABLE.
- 6 Program Bundle — $294 value. Not public. Used for exchanges/gifts. Includes: Dissociation, Chronic Fear, Anxiety & Sleep, Trauma Reactions, Grief & Loss, Chronic Fatigue.
- Guidance Session with Cheryl — $50. 30-min 1:1 support. Forward any Cheryl emails to madireece1207@gmail.com.

## App & Access
Neurotoned is available on App Store and Google Play. Use the same web credentials.

## Pay What You Can
Available for financial need. Min $5. Customer must email support directly. Follow up with a Trustpilot review request.
`;
fs.writeFileSync(path.join(kbDir, 'neurotoned-product-info.md'), neurotonedProductContent);
console.log('✓ Wrote: Neurotoned Product Info');

// ── 4. PRODUCT INFO: Aya Caps ─────────────────────────────────────────────
const ayaCapsProduct = buildFrontmatter({
  title: 'Aya Caps — Product Info',
  category: 'Product Info',
  brand: 'Aya Caps',
}) + `## What Aya Caps Are
Legal, plant-based microdose supplement from Banisteriopsis caapi vine (no DMT, no psychedelics).
Vegan, no additives, non-psychoactive, mild MAOI. Legal in all US states EXCEPT Louisiana.

## NOT Ayahuasca
Aya Caps contain ONLY the vine, not the full brew. Effects are subtle, grounding, non-hallucinogenic.

## Contains Harmala Alkaloids
Reversible MAO-A inhibitors. Build gently over time: calm focus, reduced stress reactivity, mental clarity.

## Sourcing
Northern Peru and Ecuadorian Amazon. 20% of profits go to Amazon conservation.

## Usage
Start: 1 capsule, 3x per week. Can increase to 1/day. Take with water. Less is more.

## ⚠️ Major Safety Warning — SSRIs & MAOIs
B. caapi is a mild MAOI. NEVER mix with SSRIs, SNRIs, tricyclic antidepressants, stimulants, or MAOIs without doctor approval. Risk of serotonin syndrome. Also avoid alcohol and tyramine-rich foods in large quantities. Always recommend consulting HCP.

## Safe Language
✅ "Many customers report feeling more grounded", "may support emotional resilience"
🚫 NEVER: "Treats anxiety", "heals trauma"
`;
fs.writeFileSync(path.join(kbDir, 'aya-caps-product-info.md'), ayaCapsProduct);
console.log('✓ Wrote: Aya Caps Product Info');

// ── 5. PRODUCT INFO: FlowRegen & Noctiflo ────────────────────────────────
const flowregenProduct = buildFrontmatter({
  title: 'FlowRegen & Noctiflo — Product Info',
  category: 'Product Info',
  brand: 'FlowRegen',
}) + `## FlowRegen Gummies
Men's vitality + circulation. Daily supplement. Ingredients: Muira Puama, Ashwagandha, Maca Root, Catuaba Bark, Green Tea, Caffeine (10mg), L-Arginine, Tribulus Terrestris, Horny Goat Weed.
Benefits: Energy, stamina, mood, muscle tone, circulation.
Usage: 1 gummy daily (morning/pre-workout). Full effects take 4–8 weeks.

## Noctiflo
Prostate support liquid drops for pelvic circulation, urinary urgency, and nighttime waking.
Ingredients: Horse Chestnut, Butcher's Broom, Grape Seed Extract, Stoneroot, Maca Root, Motherwort, Hawthorn.
Usage: 1 mL (dropper halfway) under tongue or in water — morning and evening.

## Counterfeit Warning
Fake versions exist on Amazon/eBay. Only products from flowregen.com and noctiflo.com are authentic and covered by the 60-day guarantee. Do NOT verify third-party sales.

## No Clinical Trials
Dietary supplements are not required to run formal RCTs. Formulations are based on botanical research and traditional use. Provide summaries if asked.
`;
fs.writeFileSync(path.join(kbDir, 'flowregen-noctiflo-product-info.md'), flowregenProduct);
console.log('✓ Wrote: FlowRegen & Noctiflo Product Info');

// ── 6. REFUND POLICIES ────────────────────────────────────────────────────
const refundContent = buildFrontmatter({
  title: 'Refund Policies — All Brands',
  category: 'Refund Policies',
  brand: 'All',
}) + `## Serotoned
- 60 days from purchase (older SOP). New SOP says 30 days from delivery + return required.
- Closure: Actively processing refunds. Empathize about closure, offer stock-up pricing first. 

## Neurotoned
- 30-day refund on programs (6-Bundle and 30-Day Program).
- NO refund on Journal (non-refundable under any circumstance).
- NO refund on subscriptions (unless customer is very upset — process to prevent disputes/reviews).
- 3-Step Refund Save Rule:
  1. Acknowledge, ask for info, suggest troubleshooting.
  2. Offer solution + gift (Journal PDF or Self-Acupressure Program).
  3. Offer Journal + another program. If still unhappy, process refund.
- If angry or threatens reviews → REFUND IMMEDIATELY. No escalation.

## Aya Caps
- 30 days from delivery. Product must be returned.

## FlowRegen & Noctiflo
- 60-Day Money-Back Guarantee (even empty bottles count).
- If no results in under 2 weeks: advise continuing (takes 4–8 weeks). Remind them of 60-day safety net.

## Reconnect+
- 90-day money-back guarantee. 1–2 bottles: no return needed. 3+ unopened: return to Largo, FL.
- Bad Reactions: Stop immediately, refund at once, log in Bad Reaction Tracker.

## Return Addresses
- Serotoned/Neurotoned/Aya Caps/Reconnect+: 8 The Green STE B, Dover, DE 19901, USA
- Reconnect+ (3+ bottles): Largo, FL

## Refund Timelines
- Process: 3–5 business days after receipt confirmation (or immediate for bad reactions).
- Bank processing: 5–10 business days to clear.
`;
fs.writeFileSync(path.join(kbDir, 'refund-policies.md'), refundContent);
console.log('✓ Wrote: Refund Policies');

// ── 7. RESPONSE TEMPLATES ─────────────────────────────────────────────────
const templateContent = buildFrontmatter({
  title: 'Standard Response Templates',
  category: 'Response Templates',
  brand: 'All',
}) + `## Refund – Ask for Feedback First
"Dear [NAME], thank you for reaching out. Before I process your refund, could you provide some additional details on what didn't meet your expectations? Your insights help us improve. With warmth, [YOUR NAME]"

## Refund – Process Confirmed
"Hi [NAME], thank you for your feedback. I've processed your refund. It may take 5–10 business days to clear. Wishing you all the best on your healing journey. With warmth, [YOUR NAME]"

## Cannot Cancel Order (Already Shipped)
"Thank you for reaching out. Unfortunately I can't cancel your order because it's already been fulfilled. If you'd like to return it once delivered, please send to: 8 The Green STE B, Dover, DE 19901, USA. We'll process your refund within 3–5 business days of receipt."

## Item Marked Delivered But Not Received
"Thank you for reaching out! Our system shows delivery at [TIME/LOCATION]. Could you check your mailbox or front porch? If you still can't locate it, please reply and we'll look into this further."

## Cannot Locate Order
"Thank you for reaching out. I'm having trouble locating your order. Could you share your order number or an alternate email/name that might be associated with your purchase? Once I locate it, I'll be happy to help."

## Interactions with Other Medications
"Great question — it's important to be cautious. We always recommend consulting your healthcare provider before combining [PRODUCT] with any prescription medications, as interactions can vary based on your individual health profile."

## Negative/Adverse Reaction
"I'm so sorry to hear you're experiencing [SYMPTOM]. Please discontinue use immediately and consult your healthcare provider. I've processed your refund and it will clear within 5–10 business days. Your health always comes first."

## Tracking a Delivery
"Hello [NAME], I hope you're well! I checked your delivery status and it shows: [STATUS]. Here is your tracking link: [LINK]. Please reach out if it doesn't arrive once marked delivered."
`;
fs.writeFileSync(path.join(kbDir, 'response-templates.md'), templateContent);
console.log('✓ Wrote: Response Templates');

// ── 8. SAFETY & COMPLIANCE ───────────────────────────────────────────────
const complianceContent = buildFrontmatter({
  title: 'Safety & Compliance Guidelines',
  category: 'Safety & Compliance',
  brand: 'All',
}) + `## Universal Rules
- NEVER make medical claims or imply treatment of any mental/physical disorder.
- We cannot diagnose, prescribe, or recommend against prescribed medications.
- Always use safe language: "supports," "may help with," "many customers report."
- Always recommend consulting a healthcare provider before combining supplements with medications.
- Never argue or act defensive. Own the solution immediately.

## At-Risk Populations
Advise HCP consultation if customer:
- Takes prescription medications (especially antidepressants, anti-anxiety, sleep aids, MAOIs)
- Has existing health conditions
- Is pregnant, breastfeeding, or under 18

## Aya Caps — MAOI Warning (CRITICAL)
B. caapi is a mild MAOI. NEVER combine with SSRIs, SNRIs, tricyclics, stimulants, or other MAOIs. Risk of serotonin syndrome. If customer has already taken it with an SSRI, advise them to contact a healthcare provider immediately.

## Serotoned — Lithium Orotate
Sero contains 5 mg lithium orotate (nutritional supplement). Completely different from prescription lithium carbonate. Safe for most — but always recommend HCP consult if on medications.

## Serotoned — Ashwagandha / St. John's Wort
Current Sero formula does NOT contain these ingredients (removed to reduce drug interactions). Safe to confirm this to customers concerned about herb-drug interactions.

## Neurotoned — Community Standards
The Neurotoned Facebook community is a safe wellness space, NOT a therapy group. Keep it positive and supportive.

## Dispute Handling
Respond to disputes in Stripe and PayPal promptly. Refund immediately to prevent escalation if customer is angry or threatening reviews.
`;
fs.writeFileSync(path.join(kbDir, 'safety-compliance.md'), complianceContent);
console.log('✓ Wrote: Safety & Compliance');

// ── 9. Clean up old undifferentiated brand SOP files ─────────────────────
const oldFiles = [
  'Serotoned SOP.md',
  'Neurotoned SOP.md',
  'Aya Caps SOP.md',
  'FlowRegen SOP.md',
  'Reconnect+ SOP.md',
];
for (const f of oldFiles) {
  const p = path.join(kbDir, f);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log(`✓ Removed: ${f} (replaced by category files)`);
  }
}

console.log('\n✅ All KB files seeded successfully!');
