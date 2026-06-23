import { createClient } from "@supabase/supabase-js";

// Conexión fija al proyecto ARIA27 en Supabase
// FIX 23-Jun-2026: fallback dummy para que `next build` en CI no truene cuando
// las env vars no están definidas. En runtime Vercel sí están, en CI no.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy-ci-build.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy_anon_key_ci_build_only";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
