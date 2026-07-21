import { Context } from "grammy";
import { trakt } from "../../trakt/client.ts";
import { backToMenu } from "../keyboards.ts";

export async function statsCommand(ctx: Context) {
  if (!ctx.traktToken) {
    await ctx.reply(
      "🔒 هذا الأمر يتطلب ربط حساب Trakt.\n\nاستخدم /start للربط.",
    );
    return;
  }

  try {
    // Get user settings for username
    const userRes = await trakt.users.settings({
      headers: { Authorization: `Bearer ${ctx.traktToken.accessToken}` },
    });

    const username = userRes.status === 200
      ? userRes.body.username
      : ctx.traktToken.username;

    // Get user stats
    const statsRes = await trakt.users.stats({
      params: { id: username },
    });

    if (statsRes.status !== 200) {
      await ctx.reply("❌ حدث خطأ أثناء تحميل الإحصائيات.");
      return;
    }

    const stats = statsRes.body;

    let message = "📊 **إحصائياتك على Trakt**\n\n";

    // Movies stats
    if (stats.movies) {
      const m = stats.movies;
      message += "🎬 **الأفلام:**\n";
      message += `   ▶️ مشاهدة: ${m.watched || 0}\n`;
      message += `   ⏱️ وقت المشاهدة: ${Math.round((m.minutes || 0) / 60)} ساعة\n`;
      message += `   ⭐ تقييمات: ${m.rated || 0}\n`;
      message += `   📋 في القائمة: ${m.watchlisted || 0}\n\n`;
    }

    // Shows stats
    if (stats.shows) {
      const s = stats.shows;
      message += "📺 **المسلسلات:**\n";
      message += `   ▶️ مشاهدة: ${s.watched || 0}\n`;
      message += `   ⏱️ وقت المشاهدة: ${Math.round((s.minutes || 0) / 60)} ساعة\n`;
      message += `   ⭐ تقييمات: ${s.rated || 0}\n`;
      message += `   📋 في القائمة: ${s.watchlisted || 0}\n`;
      message += `   📺 تعليق: ${s.collected || 0}\n\n`;
    }

    // Episodes stats
    if (stats.episodes) {
      const e = stats.episodes;
      message += "🎞️ **الحلقات:**\n";
      message += `   ▶️ مشاهدة: ${e.watched || 0}\n`;
      message += `   ⏱️ وقت المشاهدة: ${Math.round((e.minutes || 0) / 60)} ساعة\n`;
      message += `   ⭐ تقييمات: ${e.rated || 0}\n\n`;
    }

    // Total
    const totalMinutes = (stats.movies?.minutes || 0) + (stats.shows?.minutes || 0);
    const totalHours = Math.round(totalMinutes / 60);
    const days = Math.round(totalHours / 24);

    message += "📈 **الإجمالي:**\n";
    message += `   ⏱️ إجمالي وقت المشاهدة: ${totalHours.toLocaleString()} ساعة (${days} يوم)\n`;
    message += `   ⭐ إجمالي التقييمات: ${(stats.movies?.rated || 0) + (stats.shows?.rated || 0)}\n`;
    message += `   📋 إجمالي القوائم: ${(stats.movies?.watchlisted || 0) + (stats.shows?.watchlisted || 0)}\n`;

    const keyboard = [
      [{ text: "🔗 حسابك على Trakt", url: `https://trakt.tv/users/${username}` }],
      [{ text: "🔙 القائمة الرئيسية", callback_data: "back_to_menu" }],
    ];

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard },
    });
  } catch (error) {
    console.error("Stats error:", error);
    await ctx.reply("❌ حدث خطأ أثناء تحميل الإحصائيات.");
  }
}
