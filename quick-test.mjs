// quick-test.mjs — send one email, wait, then check if Supabase row saved
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('Sending test email to local API...');

const res = await fetch('http://localhost:3000/api/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': 'neurotoned_admin_token=authenticated'
  },
  body: JSON.stringify({ email: 'Hi, I need a refund on my 30-Day Program please. - Sarah, sarah@test.com' })
});

const data = await res.json();
console.log('Reply received:', data.response ? `YES (${data.response.length} chars)` : 'NO', data.error || '');
console.log('Reply preview:', data.response?.substring(0, 100));

// Wait 3s for fire-and-forget save
await new Promise(r => setTimeout(r, 3000));

console.log('\nChecking Supabase...');
const { data: rows, error } = await supabase
  .from('customer_concerns')
  .select('concern_category, sub_reason, concern_summary, customer_name, status, created_at')
  .order('created_at', { ascending: false })
  .limit(3);

if (error) {
  console.log('DB ERROR:', error.message);
} else if (!rows || rows.length === 0) {
  console.log('PROBLEM: No rows in Supabase. The save is still failing.');
} else {
  console.log(`SUCCESS: ${rows.length} rows found!\n`);
  rows.forEach((r, i) => {
    console.log(`  [${i+1}] Category:   ${r.concern_category}`);
    console.log(`       Sub-reason: ${r.sub_reason}`);
    console.log(`       Summary:    ${r.concern_summary}`);
    console.log(`       Customer:   ${r.customer_name}`);
    console.log(`       Status:     ${r.status}`);
  });
}
