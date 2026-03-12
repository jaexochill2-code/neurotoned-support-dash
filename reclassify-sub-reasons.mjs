// reclassify-sub-reasons.mjs
// Fetches all existing customer_concerns and reclassifies free-text sub_reason
// to the new 22-value canonical enum. Safe — only updates sub_reason, nothing else.

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CANONICAL = [
  "not seeing results",
  "expectations mismatch",
  "low / no engagement",
  "duplicate purchase",
  "anger / scam accusation",
  "financial hardship",
  "no reason given",
  "program not in library",
  "cannot log in",
  "app / device issue",
  "content not loading",
  "surprised by charge",
  "charged twice",
  "cancel subscription",
  "cancel autoship",
  "physical product refund",
  "shipping delayed / missing",
  "side effect concern",
  "ingredient / dosage question",
  "program usage question",
  "medication interaction",
  "positive feedback",
  "unclear / other",
];

const CANONICAL_SET = new Set(CANONICAL);

function mapSubReason(raw, category = '') {
  if (!raw) return 'unclear / other';

  // Already canonical — skip
  if (CANONICAL_SET.has(raw)) return raw;

  const s = raw.toLowerCase();
  const cat = (category || '').toLowerCase();

  // Anger / scam
  if (s.includes('scam') || s.includes('scammer') || s.includes('anger') ||
      s.includes('accused') || s.includes('disgrace') || s.includes('fraud'))
    return 'anger / scam accusation';

  // Duplicate purchase
  if (s.includes('duplicate') || s.includes('bought twice') ||
      s.includes('purchased twice') || s.includes('two programs'))
    return 'duplicate purchase';

  // Not seeing results
  if (s.includes('not seeing result') || s.includes('no result') ||
      s.includes("didn't work") || s.includes('doesnt work') ||
      s.includes('not work') || s.includes('no change'))
    return 'not seeing results';

  // Low / no engagement
  if (s.includes('0% engagement') || s.includes('low engagement') ||
      s.includes('never opened') || s.includes("didn't open") ||
      s.includes('no engagement') || s.includes('not started'))
    return 'low / no engagement';

  // Expectations mismatch
  if (s.includes('expectation') || s.includes('not what') ||
      s.includes('not right fit') || s.includes('not the right') ||
      s.includes('not for me') || s.includes('not what she') ||
      s.includes('not what he') || s.includes('programme mismatch'))
    return 'expectations mismatch';

  // No reason given
  if (s.includes('no reason') || s.includes('no specific reason') ||
      s.includes('no explanation') || s.includes('just wants refund'))
    return 'no reason given';

  // Financial hardship
  if (s.includes('financial') || s.includes('hardship') ||
      s.includes('afford') || s.includes('money tight'))
    return 'financial hardship';

  // Program not in library (Access category first)
  if ((s.includes('library') || s.includes('not in library') ||
       s.includes('program missing') || s.includes('program not found') ||
       s.includes('programs not') || s.includes('missing program') ||
       s.includes('cannot find')) && !cat.includes('technical'))
    return 'program not in library';

  // Cannot log in
  if (s.includes('login') || s.includes('log in') ||
      s.includes('password') || s.includes('cannot log') ||
      s.includes('can\'t log') || s.includes('access') && cat.includes('technical'))
    return 'cannot log in';

  // Access issues that don't fit "cannot log in"
  if (s.includes('could not access') || s.includes('couldn\'t access') ||
      s.includes('prior support attempt') || s.includes('unhelpful previous') ||
      s.includes('support at') || s.includes('felt unsupported'))
    return (cat.includes('refund') || cat.includes('access')) ? 'program not in library' : 'cannot log in';

  // App / device issue
  if (s.includes('app') || s.includes('device') || s.includes('browser') ||
      s.includes('crash') || s.includes('bug') || s.includes('glitch'))
    return 'app / device issue';

  // Content not loading
  if (s.includes('loading') || s.includes('not load') || s.includes('video') && s.includes('not'))
    return 'content not loading';

  // Charged twice
  if (s.includes('charged twice') || s.includes('double charge') ||
      s.includes('two charge') || s.includes('billed twice'))
    return 'charged twice';

  // Surprised by charge
  if (s.includes('surprised by') || s.includes('unexpected charge') ||
      s.includes('one-time') || s.includes('one time') ||
      s.includes('thought it was') || s.includes('didn\'t expect'))
    return 'surprised by charge';

  // Cancel subscription
  if ((s.includes('cancel') || s.includes('stop')) && s.includes('subscription'))
    return 'cancel subscription';

  // Cancel autoship
  if (s.includes('autoship') || s.includes('auto-ship') || s.includes('auto ship'))
    return 'cancel autoship';

  // Physical product refund
  if ((s.includes('refund') || s.includes('return')) &&
      (s.includes('capsule') || s.includes('bottle') || s.includes('physical') || s.includes('product')))
    return 'physical product refund';

  // Shipping
  if (s.includes('shipping') || s.includes('deliver') || s.includes('package') ||
      s.includes('not received') || s.includes('missing package'))
    return 'shipping delayed / missing';

  // Side effect
  if (s.includes('side effect') || s.includes('reaction') || s.includes('adverse') || s.includes('rash'))
    return 'side effect concern';

  // Ingredient / dosage
  if (s.includes('ingredient') || s.includes('dosage') || s.includes('how to take') ||
      s.includes('supplement') || s.includes('capsule') && !s.includes('refund'))
    return 'ingredient / dosage question';

  // Breathwork / program usage
  if (s.includes('breathwork') || s.includes('frequency') || s.includes('how to use') ||
      s.includes('session') || s.includes('how often') || s.includes('how many times') ||
      s.includes('program question') || s.includes('exercise question'))
    return 'program usage question';

  // Medication / medical
  if (s.includes('medication') || s.includes('drug interaction') ||
      s.includes('prescription') || s.includes('medical') || s.includes('doctor') || s.includes('symptom'))
    return 'medication interaction';

  // Positive feedback
  if (s.includes('positive') || s.includes('great') || s.includes('love') ||
      s.includes('thank') || s.includes('amazing') || s.includes('recommend'))
    return 'positive feedback';

  // Category-based fallbacks
  if (cat.includes('refund')) return 'no reason given';
  if (cat.includes('access')) return 'program not in library';
  if (cat.includes('technical') || cat.includes('login')) return 'cannot log in';
  if (cat.includes('billing') || cat.includes('subscription')) return 'surprised by charge';

  return 'unclear / other';
}

async function run() {
  console.log('Fetching all customer_concerns...');
  const { data, error } = await supabase
    .from('customer_concerns')
    .select('id, sub_reason, concern_category');

  if (error) { console.error('Fetch error:', error); process.exit(1); }
  console.log(`Found ${data.length} records.\n`);

  let updated = 0, skipped = 0, changed = 0;
  const log = [];

  for (const row of data) {
    const newVal = mapSubReason(row.sub_reason, row.concern_category);

    if (newVal === row.sub_reason) {
      skipped++;
      continue;
    }

    log.push(`  [${row.concern_category}]  "${row.sub_reason}" → "${newVal}"`);

    const { error: upErr } = await supabase
      .from('customer_concerns')
      .update({ sub_reason: newVal })
      .eq('id', row.id);

    if (upErr) {
      console.error(`Failed to update id=${row.id}:`, upErr.message);
    } else {
      updated++;
      changed++;
    }
  }

  console.log('=== RECLASSIFICATION REPORT ===');
  console.log(`  Already canonical: ${skipped}`);
  console.log(`  Updated:           ${updated}`);
  console.log(`  Total:             ${data.length}\n`);
  if (log.length > 0) {
    console.log('Changes made:');
    log.forEach(l => console.log(l));
  }
  console.log('\nDone.');
}

run().catch(console.error);
