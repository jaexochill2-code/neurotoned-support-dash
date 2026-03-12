import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { error, count } = await s.from('customer_concerns').update({ sub_reason: 'unrecognized / unexpected charge' }).eq('sub_reason', 'surprised by charge').select('id', { count: 'exact', head: true });
console.log(error?.message ?? `✓ Remapped "surprised by charge" → "unrecognized / unexpected charge" (${count ?? '?'} rows)`);
