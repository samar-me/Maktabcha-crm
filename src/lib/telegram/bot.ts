import crypto from "crypto";
import { TelegramInitDataUser } from "@/types/assignment";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export function getTelegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const username = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://maktabcha-crm.vercel.app";

  return {
    token: token || null,
    username: username || null,
    webhookSecret: webhookSecret || null,
    appUrl: appUrl.replace(/\/$/, ""),
    isConfigured: Boolean(token && username),
  };
}

/**
 * Send a message via Telegram Bot API
 */
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  extra?: {
    parse_mode?: "HTML" | "MarkdownV2" | "Markdown";
    reply_markup?: any;
  }
) {
  const { token } = getTelegramConfig();
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN sozlanmagan");
  }

  const url = `${TELEGRAM_API_BASE}/bot${token}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: extra?.parse_mode || "HTML",
      reply_markup: extra?.reply_markup,
    }),
  });

  const result = await response.json();
  if (!result.ok) {
    console.error("Telegram sendMessage error:", result);
    throw new Error(result.description || "Telegram xabar yuborishda xatolik yuz berdi");
  }

  return result.result;
}

/**
 * Configure Telegram Webhook
 */
export async function setupTelegramWebhook() {
  const { token, appUrl, webhookSecret } = getTelegramConfig();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN sozlanmagan");

  const webhookUrl = `${appUrl}/api/telegram/webhook`;
  const url = `${TELEGRAM_API_BASE}/bot${token}/setWebhook`;

  const body: any = {
    url: webhookUrl,
    allowed_updates: ["message", "edited_message"],
  };

  if (webhookSecret) {
    body.secret_token = webhookSecret;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  return result;
}

/**
 * Get Webhook Information
 */
export async function getTelegramWebhookInfo() {
  const { token } = getTelegramConfig();
  if (!token) return null;

  try {
    const url = `${TELEGRAM_API_BASE}/bot${token}/getWebhookInfo`;
    const response = await fetch(url, { method: "GET" });
    const result = await response.json();
    return result.ok ? result.result : null;
  } catch {
    return null;
  }
}

/**
 * Validates Telegram Mini App `initData` using the official Telegram WebApp signature check.
 *
 * Algorithm:
 * 1. Parse query string into key-value pairs.
 * 2. Extract and remove the `hash` field.
 * 3. Sort keys alphabetically, format as `key=value\n`.
 * 4. secret_key = HMAC_SHA256("WebAppData", botToken).
 * 5. calculated_hash = HMAC_SHA256(secret_key, data_check_string).
 * 6. Compare calculated_hash with received hash in constant time.
 * 7. Check `auth_date` freshness (reject if older than 24 hours).
 */
export function validateTelegramInitData(
  initData: string,
  maxAgeSeconds = 86400, // 24 hours
  botTokenOverride?: string
): { isValid: boolean; user?: TelegramInitDataUser; error?: string } {
  const config = getTelegramConfig();
  const token = botTokenOverride || config.token;

  // For local development or mock environments if explicitly not set:
  if (!token) {
    return {
      isValid: false,
      error: "Serverda TELEGRAM_BOT_TOKEN sozlanmagan",
    };
  }

  if (!initData || typeof initData !== "string") {
    return { isValid: false, error: "Telegram initData mavjud emas" };
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) {
      return { isValid: false, error: "initData ichida hash topilmadi" };
    }

    params.delete("hash");

    // Sort parameters alphabetically
    const keys = Array.from(params.keys()).sort();
    const dataCheckString = keys.map((k) => `${k}=${params.get(k)}`).join("\n");

    // secret_key = HMAC_SHA256("WebAppData", bot_token)
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(token)
      .digest();

    // calculated_hash = HMAC_SHA256(secret_key, data_check_string)
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    const calculatedBuffer = Buffer.from(calculatedHash, "hex");
    const receivedBuffer = Buffer.from(hash, "hex");

    if (
      calculatedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(calculatedBuffer, receivedBuffer)
    ) {
      return { isValid: false, error: "Telegram imzosi haqiqiy emas" };
    }

    // Check auth_date
    const authDateStr = params.get("auth_date");
    if (authDateStr) {
      const authDate = parseInt(authDateStr, 10);
      const now = Math.floor(Date.now() / 1000);
      if (now - authDate > maxAgeSeconds) {
        return { isValid: false, error: "Telegram sessiyasi eskirgan. Qaytadan oching." };
      }
    }

    // Parse user object
    const userStr = params.get("user");
    let user: TelegramInitDataUser | undefined;
    if (userStr) {
      user = JSON.parse(userStr);
    }

    return { isValid: true, user };
  } catch (err: any) {
    return { isValid: false, error: "initData tekshirishda xatolik: " + err.message };
  }
}
