import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "DIQQAT: NEXT_PUBLIC_SUPABASE_URL yoki NEXT_PUBLIC_SUPABASE_ANON_KEY o‘rnatilmagan. Iltimos, .env.local faylini to‘ldiring."
    );
  }

  return createBrowserClient<Database>(
    supabaseUrl || "https://placeholder-maktabcha.supabase.co",
    supabaseAnonKey || "placeholder-anon-key"
  );
}
