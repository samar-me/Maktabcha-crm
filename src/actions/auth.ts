"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function loginAction(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  cookieStore.set("maktabcha_session", "authenticated", {
    path: "/",
    httpOnly: false,
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
