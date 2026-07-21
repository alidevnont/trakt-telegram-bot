import { createBot } from "./src/bot/index.ts";

const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
const webhookUrl = Deno.args[0];

if (!botToken) {
  console.error("❌ TELEGRAM_BOT_TOKEN is required");
  Deno.exit(1);
}

if (!webhookUrl) {
  console.error("Usage: deno run -A set-webhook.ts <WEBHOOK_URL>");
  console.error("Example: deno run -A set-webhook.ts https://my-bot.deno.dev");
  Deno.exit(1);
}

const bot = createBot(botToken);

try {
  const result = await bot.api.setWebhook(webhookUrl + "/webhook");
  console.log("✅ Webhook set successfully!");
  console.log("   URL:", webhookUrl + "/webhook");
  console.log("   Result:", JSON.stringify(result));
} catch (e) {
  console.error("❌ Failed to set webhook:", e.message);
  Deno.exit(1);
}
