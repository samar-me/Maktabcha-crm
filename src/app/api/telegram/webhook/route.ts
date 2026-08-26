import { NextRequest, NextResponse } from "next/server";
import { getTelegramConfig, sendTelegramMessage } from "@/lib/telegram/bot";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { webhookSecret } = getTelegramConfig();

  // 1. Validate Webhook Secret Header if configured
  if (webhookSecret) {
    const receivedSecret = req.headers.get("x-telegram-bot-api-secret-token");
    if (receivedSecret !== webhookSecret) {
      return NextResponse.json({ error: "Ruxsat etilmagan" }, { status: 401 });
    }
  }

  try {
    const update = await req.json();
    const message = update.message || update.edited_message;

    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const text = message.text.trim();
    const chat = message.chat;

    // Match /connect CODE or /connect@botname CODE
    const connectMatch = text.match(/^\/connect(?:@[A-Za-z0-9_]+)?\s+([A-Za-z0-9]{4,10})/i);

    if (connectMatch) {
      const inputCode = connectMatch[1].toUpperCase();
      const supabase = createAdminClient();

      // Check if connect code is valid and not expired
      const { data: codeRecord, error: codeErr } = await supabase
        .from("telegram_group_connect_codes")
        .select("*, groups(name, course_name)")
        .eq("plain_code", inputCode)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (codeErr || !codeRecord) {
        await sendTelegramMessage(
          chat.id,
          "❌ <b>Ulanish kodi yaroqsiz yoki muddati o‘tgan.</b>\n\nIltimos, Maktabcha CRM'dagi guruh sahifasiga kirib yangi kod oling va qayta yuboring."
        );
        return NextResponse.json({ ok: true });
      }

      // Link the Telegram group with CRM group
      const chatTitle = chat.title || chat.username || "Telegram Guruhi";

      // Upsert telegram_group_links
      const { error: linkErr } = await supabase
        .from("telegram_group_links")
        .upsert(
          {
            group_id: codeRecord.group_id,
            telegram_chat_id: chat.id,
            telegram_chat_title: chatTitle,
            status: "Faol",
            connected_at: new Date().toISOString(),
          },
          { onConflict: "group_id" }
        );

      if (linkErr) {
        console.error("Error linking telegram group:", linkErr);
        await sendTelegramMessage(
          chat.id,
          "⚠️ Guruhni ulashda tizim xatoligi yuz berdi. Iltimos, qayta urinib ko‘ring."
        );
        return NextResponse.json({ ok: true });
      }

      // Mark connect code as used
      await supabase
        .from("telegram_group_connect_codes")
        .update({ used_at: new Date().toISOString() })
        .eq("id", codeRecord.id);

      const groupName = (codeRecord as any).groups?.name || "Guruh";

      await sendTelegramMessage(
        chat.id,
        `✅ <b>Muvaffaqiyatli ulandi!</b>\n\nUshbu Telegram guruhi Maktabcha CRM dagi <b>"${groupName}"</b> guruhi bilan bog‘landi.\n\nEndi ushbu guruhga yangi test va topshiriqlar to‘g‘ridan-to‘g‘ri yuboriladi.`
      );

      return NextResponse.json({ ok: true });
    }

    // Handle /start in private chat
    if (text.startsWith("/start") && chat.type === "private") {
      await sendTelegramMessage(
        chat.id,
        `👋 <b>Assalomu alaykum!</b>\n\nBu <b>Maktabcha CRM</b> rasmiy boti.\n\n📚 O‘quv guruhingizni ulash uchun botni guruhingizga admin sifatida qo‘shing va CRM'dan olingan <code>/connect KOD</code> buyrug‘ini guruhga yuboring.`
      );
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ ok: true });
  }
}
