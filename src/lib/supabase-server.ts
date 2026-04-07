import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

if (url && serviceKey) {
  client = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "x-aria-source": "server-admin" },
    },
  });
} else if (typeof window === "undefined") {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase-server] SUPABASE_SERVICE_ROLE_KEY no definida; supabaseAdmin estara disponible como null."
  );
}

export const supabaseAdmin: SupabaseClient | null = client;

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    throw new Error(
      "supabaseAdmin no disponible: SUPABASE_SERVICE_ROLE_KEY no configurada en Vercel"
    );
  }
  return supabaseAdmin;
}
