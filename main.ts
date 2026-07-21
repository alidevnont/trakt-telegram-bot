import { createBot } from "./src/bot/index.ts";

const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
const traktClientId = Deno.env.get("TRAKT_CLIENT_ID");
const traktClientSecret = Deno.env.get("TRAKT_CLIENT_SECRET");

if (!botToken) {
  console.error("❌ TELEGRAM_BOT_TOKEN is required");
  Deno.exit(1);
}

if (!traktClientId || !traktClientSecret) {
  console.error("❌ TRAKT_CLIENT_ID and TRAKT_CLIENT_SECRET are required");
  Deno.exit(1);
}

const bot = createBot(botToken);

console.log("🤖 Starting Trakt Telegram Bot...");

// Deno Deploy mode: use webhooks
const domain = Deno.env.get("DENO_DEPLOYMENT_ID");
const port = parseInt(Deno.env.get("PORT") || "8000");

if (domain) {
  // Running on Deno Deploy - use webhooks
  const webhookUrl = `https://${domain}.deno.dev/webhook`;

  await bot.api.setWebhook(webhookUrl);
  console.log(`✅ Webhook set: ${webhookUrl}`);

  Deno.serve({ port }, async (req) => {
    const url = new URL(req.url);

    if (url.pathname === "/webhook" && req.method === "POST") {
      const update = await req.json();
      await bot.handleUpdate(update);
      return new Response("OK");
    }

    if (url.pathname === "/health") {
      return new Response("OK");
    }

    return new Response("Trakt Telegram Bot", { status: 200 });
  });
} else {
  // Local development - use long polling
  console.log("📡 Using long polling (local mode)");

  bot.start({
    onStart: (botInfo) => {
      console.log(`✅ Bot connected as @${botInfo.username}`);
    },
  });

  Deno.addSignalListener("SIGINT", () => {
    bot.stop();
    Deno.exit(0);
  });
}
