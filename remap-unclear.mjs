// remap-unclear.mjs — reclassify the 6 "unclear / other" records using their summaries
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data } = await s.from('customer_concerns')
  .select('id, concern_category, concern_summary')
  .eq('sub_reason', 'unclear / other');

for (const row of data) {
  const sum = (row.concern_summary || '').toLowerCase();
  let newVal;

  if (sum.includes('unsafe') || sum.includes('distress') || sum.includes('body sensation') ||
      sum.includes('numb') || sum.includes('agitation') || sum.includes('hopeless') ||
      sum.includes('own skin') || sum.includes('own clothes')) {
    newVal = 'emotional distress / body safety';
  } else if (sum.includes('resonat') || sum.includes('personal trigger') ||
             sum.includes('shares') || sum.includes('positive') || sum.includes('anger') && sum.includes('content')) {
    newVal = 'positive engagement';
  } else if (sum.includes('return') || sum.includes('order detail') || sum.includes('not provided')) {
    newVal = 'pending detailed feedback';
  } else {
    continue; // leave genuinely unclear ones as-is
  }

  const { error } = await s.from('customer_concerns').update({ sub_reason: newVal }).eq('id', row.id);
  console.log(`[${row.concern_category}] "${row.concern_summary.slice(0, 70)}..." → ${newVal} ${error ? '❌' + error.message : '✓'}`);
}
console.log('Done.');
