// inspect-unclear.mjs — read concern_summary for all "unclear / other" records
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data } = await s.from('customer_concerns')
  .select('id, concern_category, concern_summary, sub_reason')
  .eq('sub_reason', 'unclear / other');

console.log(`"unclear / other" records: ${data.length}`);
data.forEach(r => console.log(`  [${r.concern_category}] ${r.concern_summary}`));
