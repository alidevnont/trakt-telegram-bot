import { load } from "std/dotenv";
import { createBot } from "./src/bot/index.ts";

// Load environment variables
await load();

// Validate required env vars
const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
const traktClientId = Deno.env.get("TRAKT_CLIENT_ID");
const traktClientSecret = Deno.env.get("TRAKT_CLIENT_SECRET");

if (!botToken) {
  console.error("❌ TELEGRAM_BOT_TOKEN is required");
  Deno.exit(1);
}

if (!traktClientId || !traktClientSecret) {
  console.error("❌ TRAKT_CLIENT_ID and TRAKT_CLIENT_SECRET are required");
  console.error("   Get them from: https://trakt.tv/oauth/applications");
  Deno.exit(1);
}

// Create and start bot
const bot = createBot(botToken);

console.log("🤖 Starting Trakt Telegram Bot...");

bot.start({
  onStart: (botInfo) => {
    console.log(`✅ Bot connected as @${botInfo.username}`);
    console.log(`   User: ${botInfo.first_name}`);
    console.log("   Press Ctrl+C to stop");
  },
});

// Graceful shutdown
Deno.addSignalListener("SIGINT", () => {
  console.log("\n🛑 Stopping bot...");
  bot.stop();
  Deno.exit(0);
});

Deno.addSignalListener("SIGTERM", () => {
  console.log("\n🛑 Stopping bot...");
  bot.stop();
  Deno.exit(0);
});
