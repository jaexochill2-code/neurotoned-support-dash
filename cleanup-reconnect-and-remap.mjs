// cleanup-reconnect-and-remap.mjs
// 1. Delete all Reconnect+ records from customer_concerns
// 2. Remap "low / no engagement" → "pending detailed feedback"
// 3. Remap "no reason given" → "pending detailed feedback"
// 4. Remap "cancel autoship" → remove with Reconnect+ records (already gone after step 1)
//    But some may have been saved with a different concern_bin, so fix those too

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // 1. Delete Reconnect+ records
  const { data: reconnect, error: fetchErr } = await supabase
    .from('customer_concerns')
    .select('id, concern_category, sub_reason')
    .in('concern_category', ['Reconnect+ Cancel', 'Reconnect+ Refund', 'Reconnect+ Issue']);

  if (fetchErr) { console.error('Fetch error:', fetchErr); process.exit(1); }

  console.log(`Found ${reconnect.length} Reconnect+ records to delete.`);
  if (reconnect.length > 0) {
    const ids = reconnect.map(r => r.id);
    reconnect.forEach(r => console.log(`  DELETE [${r.concern_category}] sub: ${r.sub_reason}`));
    const { error: delErr } = await supabase
      .from('customer_concerns')
      .delete()
      .in('id', ids);
    if (delErr) console.error('Delete error:', delErr.message);
    else console.log(`✓ Deleted ${reconnect.length} Reconnect+ records.\n`);
  }

  // 2. Remap "low / no engagement" → "pending detailed feedback"
  const { error: e2 } = await supabase
    .from('customer_concerns')
    .update({ sub_reason: 'pending detailed feedback' })
    .eq('sub_reason', 'low / no engagement');
  console.log('Remap "low / no engagement":', e2?.message ?? '✓ Done');

  // 3. Remap "no reason given" → "pending detailed feedback"
  const { error: e3 } = await supabase
    .from('customer_concerns')
    .update({ sub_reason: 'pending detailed feedback' })
    .eq('sub_reason', 'no reason given');
  console.log('Remap "no reason given":', e3?.message ?? '✓ Done');

  // 4. Remap any leftover "cancel autoship" records (from non-Reconnect+ bins)
  const { error: e4 } = await supabase
    .from('customer_concerns')
    .update({ sub_reason: 'unclear / other' })
    .eq('sub_reason', 'cancel autoship');
  console.log('Remap "cancel autoship" leftovers:', e4?.message ?? '✓ Done');

  // 5. Remap "physical product refund" leftovers
  const { error: e5 } = await supabase
    .from('customer_concerns')
    .update({ sub_reason: 'unclear / other' })
    .eq('sub_reason', 'physical product refund');
  console.log('Remap "physical product refund" leftovers:', e5?.message ?? '✓ Done');

  // Final count
  const { count } = await supabase
    .from('customer_concerns')
    .select('*', { count: 'exact', head: true });
  console.log(`\nFinal record count: ${count}`);
  console.log('All done.');
}

run().catch(console.error);
