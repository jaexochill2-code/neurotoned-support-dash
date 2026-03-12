// fix-reclassify-edge-cases.mjs — correct 2 known misclassifications
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // Fix 1: "refund not received / chargeback threat" → digital refund, not shipping
  const fix1 = await supabase
    .from('customer_concerns')
    .update({ sub_reason: 'no reason given' })
    .or('sub_reason.eq."shipping delayed / missing"')
    .ilike('raw_customer_email', '%chargeback%');

  // Fix 2: "positive review of app and program" was > misclassified as "app / device issue"
  const fix2 = await supabase
    .from('customer_concerns')
    .update({ sub_reason: 'positive feedback' })
    .eq('sub_reason', 'app / device issue')
    .eq('concern_category', 'General Feedback');

  console.log('Fix 1 (chargeback → no reason given):', fix1.error?.message ?? 'OK');
  console.log('Fix 2 (General Feedback app → positive feedback):', fix2.error?.message ?? 'OK');
  console.log('Done.');
}

run().catch(console.error);
