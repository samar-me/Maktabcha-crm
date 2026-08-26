import "server-only";

import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

/**
 * Server-only Supabase Admin Client.
 * Uses SUPABASE_SERVICE_ROLE_KEY to perform privileged operations like managing
 * the public.personal_auth table.
 *
 * CRITICAL: This file contains "server-only" and must NEVER be imported in Client Components.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Konfiguratsiya xatosi: NEXT_PUBLIC_SUPABASE_URL o‘rnatilmagan."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Konfiguratsiya xatosi: SUPABASE_SERVICE_ROLE_KEY o‘rnatilmagan. Shaxsiy PIN va xavfsizlikni boshqarish uchun bu kalit zarur."
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
