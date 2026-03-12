// deduplicate-db.mjs — keeps the earliest record per unique raw email, deletes the rest
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('customer_concerns')
    .select('id, customer_name, concern_category, sub_reason, date_received, raw_customer_email')
    .order('date_received', { ascending: true }); // oldest first → we keep oldest

  if (error) { console.error(error); process.exit(1); }
  console.log(`Total records: ${data.length}`);

  // Group by first 200 chars of raw_customer_email
  const seen = new Map();
  const toDelete = [];

  for (const row of data) {
    const key = (row.raw_customer_email || '').trim().slice(0, 200);
    if (!seen.has(key)) {
      seen.set(key, row.id); // keep the first (oldest)
    } else {
      toDelete.push(row.id);
    }
  }

  console.log(`Keeping: ${data.length - toDelete.length} records`);
  console.log(`Deleting: ${toDelete.length} duplicates\n`);

  if (toDelete.length === 0) {
    console.log('No duplicates found. Done.');
    return;
  }

  // Batch delete in chunks of 20
  const CHUNK = 20;
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += CHUNK) {
    const chunk = toDelete.slice(i, i + CHUNK);
    const { error: delErr } = await supabase
      .from('customer_concerns')
      .delete()
      .in('id', chunk);
    if (delErr) {
      console.error(`Chunk ${i}-${i + CHUNK} error:`, delErr.message);
    } else {
      deleted += chunk.length;
      process.stdout.write(`  Deleted ${deleted}/${toDelete.length}...\r`);
    }
  }

  const { count } = await supabase
    .from('customer_concerns')
    .select('*', { count: 'exact', head: true });

  console.log(`\n✓ Done. Final record count: ${count}`);
}

run().catch(console.error);
