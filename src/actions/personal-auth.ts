"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashPin, generateSalt, verifyPinWithHash } from "@/lib/personal-crypto";

/**
 * Check if the CRM owner has already configured a 4-digit PIN.
 * Returns only { configured: boolean }, never exposing hashes or secrets.
 */
export async function getPersonalAuthStatusAction(): Promise<{
  configured: boolean;
  error?: string;
}> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("personal_auth")
      .select("id")
      .limit(1);

    if (error) {
      console.error("Error checking personal_auth status:", error);
      return { configured: false, error: error.message };
    }

    return { configured: (data && data.length > 0) || false };
  } catch (err: any) {
    console.error("Personal auth status exception:", err);
    return { configured: false, error: err.message || "Tizim holatini tekshirishda xatolik" };
  }
}

/**
 * Verify the master password against MAKTABCHA_MASTER_PASSWORD.
 * Strictly server-side, no public fallback password.
 */
export async function verifyMasterPasswordAction(
  inputPassword: string
): Promise<{ success: boolean; error?: string }> {
  const masterPass = process.env.MAKTABCHA_MASTER_PASSWORD;

  if (!masterPass) {
    return {
      success: false,
      error: "Konfiguratsiya xatosi: MAKTABCHA_MASTER_PASSWORD .env.local faylida sozlanmagan.",
    };
  }

  if (!inputPassword || !inputPassword.trim()) {
    return { success: false, error: "Asosiy parol kiritilmagan" };
  }

  if (inputPassword.trim() === masterPass.trim()) {
    return { success: true };
  }

  return { success: false, error: "Asosiy parol noto‘g‘ri" };
}

/**
 * Set up a new 4-digit PIN using Master Password authorization.
 * Saves salted scrypt hash to public.personal_auth, then signs into Supabase Auth.
 */
export async function setupPinAction(
  masterPassword: string,
  pin: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Verify master password
  const masterCheck = await verifyMasterPasswordAction(masterPassword);
  if (!masterCheck.success) {
    return { success: false, error: masterCheck.error };
  }

  // 2. Validate PIN format
  if (!/^\d{4}$/.test(pin)) {
    return { success: false, error: "PIN-kod aynan 4 ta raqamdan iborat bo‘lishi kerak" };
  }

  try {
    // 3. Generate salt and scrypt hash
    const salt = generateSalt();
    const hash = await hashPin(pin, salt);

    // 4. Save to public.personal_auth table via Admin client
    const admin = createAdminClient();
    const { data: existingRows } = await admin
      .from("personal_auth")
      .select("id")
      .limit(1);

    if (existingRows && existingRows.length > 0) {
      const { error: updateErr } = await admin
        .from("personal_auth")
        .update({
          pin_hash: hash,
          pin_salt: salt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRows[0].id);

      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await admin.from("personal_auth").insert({
        pin_hash: hash,
        pin_salt: salt,
      });

      if (insertErr) throw insertErr;
    }

    // 5. Sign into Supabase Auth on server-side to establish SSR session cookies
    await signInToSupabaseAuth();

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err: any) {
    console.error("Error setting up PIN:", err);
    return { success: false, error: err.message || "PIN-kodni saqlashda xatolik yuz berdi" };
  }
}

/**
 * Daily login with 4-digit PIN.
 * Verifies PIN hash against stored personal_auth row, then signs into Supabase Auth.
 */
export async function loginWithPinAction(
  pin: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Validate PIN format
  if (!/^\d{4}$/.test(pin)) {
    return { success: false, error: "PIN-kod 4 xonali raqam bo‘lishi kerak" };
  }

  try {
    // 2. Fetch stored PIN hash from public.personal_auth via Admin Client
    const admin = createAdminClient();
    const { data: rows, error: fetchErr } = await admin
      .from("personal_auth")
      .select("id, pin_hash, pin_salt")
      .limit(1);

    if (fetchErr) {
      console.error("Error querying personal_auth:", fetchErr);
      return { success: false, error: "Tizim xavfsizlik ma'lumotlarini yuklashda xatolik" };
    }

    if (!rows || rows.length === 0) {
      return {
        success: false,
        error: "PIN-kod hali o‘rnatilmagan. Iltimos, asosiy parol orqali kiring.",
      };
    }

    const { pin_hash, pin_salt } = rows[0];

    // 3. Verify PIN with scrypt & timingSafeEqual
    const isValid = await verifyPinWithHash(pin, pin_hash, pin_salt);
    if (!isValid) {
      return { success: false, error: "Kiritilgan PIN-kod noto‘g‘ri" };
    }

    // 4. Authenticate Supabase SSR Session on Server Side
    const authResult = await signInToSupabaseAuth();
    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err: any) {
    console.error("Login with PIN exception:", err);
    return { success: false, error: err.message || "Tizimga kirishda kutilmagan xatolik yuz berdi" };
  }
}

/**
 * Change PIN code from Settings page.
 */
export async function changePinAction(
  masterPassword: string,
  newPin: string
): Promise<{ success: boolean; error?: string }> {
  return setupPinAction(masterPassword, newPin);
}

/**
 * Reset PIN code (removes configured PIN, requiring setup on next login).
 */
export async function resetPinAction(
  masterPassword: string
): Promise<{ success: boolean; error?: string }> {
  const masterCheck = await verifyMasterPasswordAction(masterPassword);
  if (!masterCheck.success) {
    return { success: false, error: masterCheck.error };
  }

  try {
    const admin = createAdminClient();
    const { error: delErr } = await admin.from("personal_auth").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (delErr) throw delErr;

    return { success: true };
  } catch (err: any) {
    console.error("Error resetting PIN:", err);
    return { success: false, error: err.message || "PIN-kodni o‘chirishda xatolik" };
  }
}

/**
 * Log out and clear Supabase Auth session cookies.
 */
export async function logoutAction(): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (e) {
    console.error("Error signing out from Supabase:", e);
  }

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Internal helper to sign into the single private Supabase Auth account.
 * Credentials come exclusively from server-side environment variables.
 */
async function signInToSupabaseAuth(): Promise<{ success: boolean; error?: string }> {
  const email = process.env.MAKTABCHA_SUPABASE_EMAIL;
  const password = process.env.MAKTABCHA_SUPABASE_PASSWORD;

  if (!email || !password) {
    return {
      success: false,
      error:
        "Konfiguratsiya xatosi: MAKTABCHA_SUPABASE_EMAIL yoki MAKTABCHA_SUPABASE_PASSWORD .env.local faylida sozlanmagan.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Supabase signInWithPassword error:", error);
    return {
      success: false,
      error: `Supabase foydalanuvchisini tasdiqlashda xatolik: ${error.message}`,
    };
  }

  return { success: true };
}
