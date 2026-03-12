// audit-duplicates.mjs — inspect what duplicates exist before deleting anything
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
    .select('id, customer_name, customer_email_address, concern_category, sub_reason, date_received, raw_customer_email')
    .order('date_received', { ascending: true });

  if (error) { console.error(error); process.exit(1); }

  console.log(`Total records: ${data.length}\n`);

  // Group by raw_customer_email (trimmed) - same email text = same submission
  const byRaw = {};
  for (const row of data) {
    const key = (row.raw_customer_email || '').trim().slice(0, 200); // first 200 chars as key
    if (!byRaw[key]) byRaw[key] = [];
    byRaw[key].push(row);
  }

  const dupeGroups = Object.entries(byRaw).filter(([, rows]) => rows.length > 1);
  console.log(`Duplicate groups (same raw email): ${dupeGroups.length}`);
  
  let totalDupes = 0;
  for (const [key, rows] of dupeGroups) {
    totalDupes += rows.length - 1; // keep 1, delete the rest
    console.log(`\n  [${rows[0].concern_category}] "${rows[0].customer_name}" — ${rows.length}x`);
    console.log(`  sub_reason: ${rows[0].sub_reason}`);
    console.log(`  dates: ${rows.map(r => r.date_received?.slice(0,10)).join(', ')}`);
    console.log(`  ids to delete: ${rows.slice(1).map(r => r.id).join(', ')}`);
  }
  
  console.log(`\nWould delete: ${totalDupes} records (keep ${data.length - totalDupes} unique)`);
}

run().catch(console.error);
