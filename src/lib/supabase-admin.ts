import { createClient } from "@supabase/supabase-js";

// This admin client bypasses RLS using the service role key.
// NEVER use this client-side or pass this client to the browser.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
