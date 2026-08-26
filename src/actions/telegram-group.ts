"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { generateGroupConnectCode, hashToken } from "@/lib/student-crypto";
import { getTelegramConfig, sendTelegramMessage } from "@/lib/telegram/bot";
import { revalidatePath } from "next/cache";

/**
 * Get Telegram connection status for a CRM group
 */
export async function getGroupTelegramStatusAction(groupId: string) {
  try {
    const supabase = createAdminClient();
    const { data: link, error } = await supabase
      .from("telegram_group_links")
      .select("*")
      .eq("group_id", groupId)
      .maybeSingle();

    if (error || !link) {
      return { isLinked: false, link: null };
    }

    return {
      isLinked: link.status === "Faol",
      link,
    };
  } catch (err) {
    console.error("Error fetching group telegram status:", err);
    return { isLinked: false, link: null };
  }
}

/**
 * Generate a short 6-character connection code for a group (Valid for 15 minutes)
 */
export async function generateTelegramGroupConnectCodeAction(groupId: string) {
  try {
    const { username, isConfigured } = getTelegramConfig();
    const supabase = createAdminClient();

    // Verify group exists
    const { data: group, error: grErr } = await supabase
      .from("groups")
      .select("id, name")
      .eq("id", groupId)
      .single();

    if (grErr || !group) {
      return { success: false, error: "Guruh topilmadi" };
    }

    const code = generateGroupConnectCode();
    const codeHash = hashToken(code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    const { error: insErr } = await supabase
      .from("telegram_group_connect_codes")
      .insert({
        group_id: groupId,
        plain_code: code,
        code_hash: codeHash,
        expires_at: expiresAt,
      });

    if (insErr) {
      console.error("Error generating connect code:", insErr);
      return { success: false, error: "Ulanish kodini yaratishda xatolik yuz berdi" };
    }

    return {
      success: true,
      code,
      expiresAt,
      botUsername: username || "MaktabchaBot",
      isBotConfigured: isConfigured,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik yuz berdi" };
  }
}

/**
 * Disconnect a linked Telegram group
 */
export async function disconnectTelegramGroupAction(groupId: string) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("telegram_group_links")
      .delete()
      .eq("group_id", groupId);

    if (error) {
      return { success: false, error: "Telegram guruhini uzishda xatolik yuz berdi" };
    }

    revalidatePath(`/groups/${groupId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Kutilmagan xatolik yuz berdi" };
  }
}

/**
 * Send a test notification to the linked Telegram group
 */
export async function sendTestTelegramMessageAction(groupId: string) {
  try {
    const supabase = createAdminClient();
    const { data: link, error: linkErr } = await supabase
      .from("telegram_group_links")
      .select("*, groups(name)")
      .eq("group_id", groupId)
      .single();

    if (linkErr || !link) {
      return { success: false, error: "Guruhga ulangan Telegram chat topilmadi" };
    }

    const groupName = (link as any).groups?.name || "Guruh";

    await sendTelegramMessage(
      link.telegram_chat_id,
      `🔔 <b>Test Xabar!</b>\n\nMaktabcha CRM orqali <b>"${groupName}"</b> guruhiga sinov xabari muvaffaqiyatli yetkazildi. ✅`
    );

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Xabar yuborishda xatolik yuz berdi" };
  }
}

/**
 * Get Telegram Bot Configuration Overview for Admin Settings
 */
export async function getTelegramBotSettingsAction() {
  try {
    const { isConfigured, username, webhookSecret } = getTelegramConfig();
    const supabase = createAdminClient();

    const { count: connectedCount } = await supabase
      .from("telegram_group_links")
      .select("*", { count: "exact", head: true })
      .eq("status", "Faol");

    return {
      isConfigured,
      botUsername: username || null,
      hasWebhookSecret: Boolean(webhookSecret),
      connectedGroupsCount: connectedCount || 0,
    };
  } catch (err) {
    console.error("Error fetching bot settings:", err);
    return {
      isConfigured: false,
      botUsername: null,
      hasWebhookSecret: false,
      connectedGroupsCount: 0,
    };
  }
}
