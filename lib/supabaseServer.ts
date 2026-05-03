import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Do not throw at import time in case environment is configured differently in tests,
  // but log so developers notice missing keys.
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase not fully configured. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or ANON key) are set."
  );
}

export function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Supabase URL or key is not configured in environment variables");
  }

  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });
}

export default getSupabaseClient;
