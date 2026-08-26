"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function verifyMasterPasswordAction(
  inputPassword: string
): Promise<{ success: boolean; error?: string }> {
  const configuredPassword =
    process.env.MAKTABCHA_MASTER_PASSWORD ||
    process.env.MASTER_PASSWORD ||
    "@Samar18";

  if (!inputPassword || !inputPassword.trim()) {
    return { success: false, error: "Parol kiritilmagan" };
  }

  if (inputPassword.trim() === configuredPassword) {
    return { success: true };
  }

  return { success: false, error: "Asosiy parol noto‘g‘ri" };
}

export async function loginAction(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  cookieStore.set("maktabcha_session", "authenticated", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    secure: process.env.NODE_ENV === "production",
  });

  revalidatePath("/", "layout");
  return { success: true };
}

export async function logoutAction(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  cookieStore.delete("maktabcha_session");
  revalidatePath("/", "layout");
  return { success: true };
}
