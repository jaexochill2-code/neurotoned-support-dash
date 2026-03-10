import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function purgeAndFix() {
  console.log("1. Purging all rows from customer_concerns...");
  const { error: deleteError } = await supabase
    .from('customer_concerns')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything

  if (deleteError) {
    console.error("Failed to delete rows:", deleteError);
  } else {
    console.log("✅ Successfully purged customer_concerns table.");
  }
}

purgeAndFix();
