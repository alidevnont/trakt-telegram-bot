import { Context } from "grammy";
import { trakt } from "../../trakt/client.ts";
import { getDeviceCode, pollDeviceToken } from "../../trakt/auth.ts";
import { saveToken } from "../../storage/tokens.ts";
import { mainMenu } from "../keyboards.ts";

export async function startCommand(ctx: Context) {
  const userId = ctx.from?.id?.toString();
  if (!userId) return;

  if (ctx.traktToken) {
    await ctx.reply(
      `مرحباً! أنت مرتبط بحساب Trakt ✅\n\n👤 المستخدم: ${ctx.traktToken.username}\n\nاختر من القائمة:`,
      { reply_markup: mainMenu },
    );
    return;
  }

  await ctx.reply("🔄 جاري إنشاء رمز التنشيط...");

  try {
    const deviceCode = await getDeviceCode();

    const message = [
      "🔗 **ربط حساب Trakt**\n",
      "1. افتح الرابط التالي في المتصفح:",
      `🔗 ${deviceCode.verification_url}/${deviceCode.user_code}\n`,
      "2. أدخل الرمز: `" + deviceCode.user_code + "`",
      "3. اضغط **Approve** للتأكيد",
      `⏰ الرمز صالح لمدة ${Math.floor(deviceCode.expires_in / 60)} دقيقة`,
      "⏳ أنتظر التأكيد...",
    ].join("\n");

    await ctx.reply(message, { parse_mode: "Markdown" });

    const startTime = Date.now();
    const maxWait = deviceCode.expires_in * 1000;
    const interval = Math.max(deviceCode.interval, 5) * 1000;

    while (Date.now() - startTime < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, interval));

      try {
        const token = await pollDeviceToken(deviceCode.device_code);

        if (token) {
          // Fetch actual Trakt username from the API
          let traktUsername = "Unknown";
          try {
            const settingsRes = await trakt.users.settings({
              headers: { Authorization: `Bearer ${token.access_token}` },
            });
            if (settingsRes.status === 200 && settingsRes.body?.user) {
              traktUsername = settingsRes.body.user.username || settingsRes.body.user.ids?.slug || "Unknown";
            }
          } catch (e) {
            console.error("Failed to fetch Trakt username:", e);
          }

          await saveToken(userId, {
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresAt: Date.now() + token.expires_in * 1000,
            username: traktUsername,
          });

          await ctx.reply(
            "✅ **تم ربط الحساب بنجاح!**\n\n" +
              `👤 المستخدم: ${traktUsername}\n` +
              "يمكنك الآن استخدام جميع ميزات البوت.\n" +
              "اختر من القائمة:",
            { parse_mode: "Markdown", reply_markup: mainMenu },
          );
          return;
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("expired")) {
            await ctx.reply("⏰ انتهت صلاحية الرمز.\n\nاستخدم /start لإنشاء رمز جديد.");
            return;
          }
          if (error.message.includes("denied")) {
            await ctx.reply("❌ تم رفض التنشيط.\n\nاستخدم /start للمحاولة مرة أخرى.");
            return;
          }
        }
      }
    }

    await ctx.reply("⏰ انتهت مهلة الانتظار.\n\nاستخدم /start لإنشاء رمز جديد.");
  } catch (error) {
    console.error("Device code error:", error);
    await ctx.reply("❌ حدث خطأ أثناء إنشاء رمز التنشيط.\n\nحاول مرة أخرى بـ /start");
  }
}

export async function unlinkCommand(ctx: Context) {
  const userId = ctx.from?.id?.toString();
  if (!userId) return;

  if (!ctx.traktToken) {
    await ctx.reply("أنت غير مرتبط بحساب Trakt.");
    return;
  }

  const { deleteToken } = await import("../../storage/tokens.ts");
  await deleteToken(userId);

  await ctx.reply("✅ تم فصل الحساب بنجاح.\n\nاستخدم /start للربط مرة أخرى.");
}
