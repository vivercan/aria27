import { createClient } from "@supabase/supabase-js";

// 🔒 Conexión fija al proyecto real de Supabase (ARIA27)
const supabaseUrl = "https://vimztapqbwtwkmotpqia.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbXp0YXBxYnd0d2ttb3RwcWlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxODI3NDQsImV4cCI6MjA3ODc1ODc0NH0.LK0KTLu15PwNGa4FMvwy4D1P7d6x6fQvoYsdU652J4Q";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase credentials missing");
}

// Cliente único para todo ARIA27
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
