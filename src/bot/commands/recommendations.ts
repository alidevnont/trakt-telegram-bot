import { Context } from "grammy";
import { trakt } from "../../trakt/client.ts";
import { backToMenu } from "../keyboards.ts";

export async function recommendationsCommand(ctx: Context) {
  if (!ctx.traktToken) {
    await ctx.reply(
      "🔒 هذا الأمر يتطلب ربط حساب Trakt.\n\nاستخدم /start للربط.",
    );
    return;
  }

  try {
    const [moviesRes, showsRes] = await Promise.all([
      trakt.recommendations.movies.recommend({
        headers: { Authorization: `Bearer ${ctx.traktToken.accessToken}` },
      }),
      trakt.recommendations.shows.recommend({
        headers: { Authorization: `Bearer ${ctx.traktToken.accessToken}` },
      }),
    ]);

    let message = "🎯 **توصياتك الشخصية**\n\n";
    const keyboard = [];

    if (moviesRes.status === 200 && moviesRes.body.length > 0) {
      message += "🎬 **أفلام موصى بها:**\n\n";
      for (const movie of moviesRes.body.slice(0, 5)) {
        message += `• **${movie.title}** (${movie.year || "?"})\n`;
        message += `  ⭐ ${movie.rating || "N/A"}\n`;
        keyboard.push([
          { text: `🎬 ${movie.title}`, callback_data: `detail:${movie.ids?.slug}` },
        ]);
      }
    }

    if (showsRes.status === 200 && showsRes.body.length > 0) {
      message += "\n📺 **مسلسلات موصى بها:**\n\n";
      for (const show of showsRes.body.slice(0, 5)) {
        message += `• **${show.title}** (${show.year || "?"})\n`;
        message += `  ⭐ ${show.rating || "N/A"}\n`;
        keyboard.push([
          { text: `📺 ${show.title}`, callback_data: `detail:${show.ids?.slug}` },
        ]);
      }
    }

    if (moviesRes.status !== 200 && showsRes.status !== 200) {
      await ctx.reply(
        "❌ لا توجد توصيات حالياً.",
        { reply_markup: backToMenu() },
      );
      return;
    }

    keyboard.push([{ text: "🔙 القائمة الرئيسية", callback_data: "back_to_menu" }]);

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard },
    });
  } catch (error) {
    console.error("Recommendations error:", error);
    await ctx.reply("❌ حدث خطأ أثناء تحميل التوصيات.");
  }
}
