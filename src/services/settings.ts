import { createClient } from "@/lib/supabase/client";
import { SystemSettings } from "@/types/database";

export async function getSettings(): Promise<SystemSettings> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching settings:", error);
  }

  if (data) {
    return data as SystemSettings;
  }

  // Fallback defaults
  return {
    id: "default-settings",
    center_name: "Maktabcha O‘quv Markazi",
    logo_url: null,
    admin_name: "Bosh Administrator",
    default_currency: "UZS",
    default_monthly_fee: 350000,
    phone: "+998 90 123 45 67",
    address: "Toshkent shahar, Chilonzor tumani",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function updateSettings(
  updates: Partial<Omit<SystemSettings, "id" | "created_at" | "updated_at">>
): Promise<SystemSettings> {
  const supabase = createClient();
  const current = await getSettings();

  const { data, error } = await (supabase.from("settings") as any)
    .upsert({
      id: current.id === "default-settings" ? "a0000000-0000-0000-0000-000000000001" : current.id,
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error updating settings:", error);
    throw new Error(error.message);
  }

  return data as SystemSettings;
}
