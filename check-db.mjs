import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDb() {
  const { data, error } = await supabase
    .from('customer_concerns')
    .select('concern_category, sub_reason, date_received');

  if (error) {
    console.error("DB check failed:", error);
    return;
  }
  
  console.log(`\n✅ Found ${data.length} concerns tracked in Supabase.`);
  
  const groupBy = {};
  data.forEach(d => {
    groupBy[d.concern_category] = (groupBy[d.concern_category] || 0) + 1;
  });
  
  console.log("\n📊 Category Distribution:");
  Object.entries(groupBy).forEach(([cat, count]) => {
    console.log(`  - ${cat}: ${count}`);
  });
  
  const nullDates = data.filter(d => !d.date_received).length;
  console.log(`\n📅 Null date_received count: ${nullDates} (Should be 0)`);
}

checkDb();
