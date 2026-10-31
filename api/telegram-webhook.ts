import type { VercelRequest, VercelResponse } from "@vercel/node";

const APP_URL = "https://schedule-ond.vercel.app";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return res.status(500).json({ error: "TELEGRAM_BOT_TOKEN is missing" });
  }

  try {
    const message = req.body?.message;
    const chatId = message?.chat?.id;
    const text = message?.text || "";

    if (chatId && text.startsWith("/start")) {
      const response = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "Привет! Здесь ты можешь составить пожелания по графику.",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Начать👇",
                    web_app: { url: APP_URL },
                  },
                ],
              ],
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Telegram API error:", error);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return res.status(200).json({ ok: true });
  }
}
