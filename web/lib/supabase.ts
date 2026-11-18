import { createClient } from "@supabase/supabase-js";

// Solo para código de servidor: usa la service role key.
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
