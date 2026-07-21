import { createBot } from "./src/bot/index.ts";

const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
const traktClientId = Deno.env.get("TRAKT_CLIENT_ID");
const traktClientSecret = Deno.env.get("TRAKT_CLIENT_SECRET");
const webhookUrl = Deno.env.get("WEBHOOK_URL");

if (!botToken) {
  console.error("❌ TELEGRAM_BOT_TOKEN is required");
  Deno.exit(1);
}

if (!traktClientId || !traktClientSecret) {
  console.error("❌ TRAKT_CLIENT_ID and TRAKT_CLIENT_SECRET are required");
  Deno.exit(1);
}

const bot = createBot(botToken);
const port = parseInt(Deno.env.get("PORT") || "8000");
const cleanWebhookUrl = webhookUrl?.replace(/\/+$/, "");

console.log("🤖 Starting Trakt Telegram Bot...");

Deno.serve({ port }, async (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/webhook" && req.method === "POST") {
    try {
      const update = await req.json();
      await bot.handleUpdate(update);
    } catch (e) {
      console.error("Webhook error:", e);
    }
    return new Response("OK");
  }

  if (url.pathname === "/health") {
    return new Response("OK");
  }

  if (url.pathname === "/set-webhook" && req.method === "POST") {
    if (!webhookUrl) {
      return new Response("WEBHOOK_URL not set", { status: 500 });
    }
    try {
      const result = await bot.api.setWebhook(cleanWebhookUrl + "/webhook");
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Trakt Telegram Bot is running", { status: 200 });
});

console.log(`✅ Server running on port ${port}`);
if (cleanWebhookUrl) {
  console.log(`📡 Webhook: ${cleanWebhookUrl}/webhook`);
  console.log("💡 Visit /set-webhook to register the webhook");
} else {
  console.log("⚠️ WEBHOOK_URL not set. Set it in Deno Deploy env vars.");
}
