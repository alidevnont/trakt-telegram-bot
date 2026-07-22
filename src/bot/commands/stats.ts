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
    const username = ctx.traktToken.username;

    const statsRes = await trakt.users.stats({
      params: { id: username },
    });

    if (statsRes.status !== 200) {
      await ctx.reply("❌ حدث خطأ أثناء تحميل الإحصائيات.");
      return;
    }

    const stats = statsRes.body;

    let message = "📊 **إحصائياتك على Trakt**\n\n";

    if (stats.movies) {
      const m = stats.movies;
      message += "🎬 **الأفلام:**\n";
      message += `   ▶️ مشاهدة: ${m.watched || 0}\n`;
      message += `   ⏱️ وقت المشاهدة: ${Math.round((m.minutes || 0) / 60)} ساعة\n`;
      message += `   ⭐ تقييمات: ${m.rated || 0}\n\n`;
    }

    if (stats.shows) {
      const s = stats.shows;
      message += "📺 **المسلسلات:**\n";
      message += `   ▶️ مشاهدة: ${s.watched || 0}\n`;
      message += `   ⏱️ وقت المشاهدة: ${Math.round((s.minutes || 0) / 60)} ساعة\n`;
      message += `   ⭐ تقييمات: ${s.rated || 0}\n\n`;
    }

    if (stats.episodes) {
      const e = stats.episodes;
      message += "🎞️ **الحلقات:**\n";
      message += `   ▶️ مشاهدة: ${e.watched || 0}\n`;
      message += `   ⏱️ وقت المشاهدة: ${Math.round((e.minutes || 0) / 60)} ساعة\n\n`;
    }

    const totalMinutes = (stats.movies?.minutes || 0) + (stats.shows?.minutes || 0);
    const totalHours = Math.round(totalMinutes / 60);
    const days = Math.round(totalHours / 24);

    message += "📈 **الإجمالي:**\n";
    message += `   ⏱️ إجمالي وقت المشاهدة: ${totalHours.toLocaleString()} ساعة (${days} يوم)\n`;

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
