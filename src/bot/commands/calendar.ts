import { Context } from "grammy";
import { trakt } from "../../trakt/client.ts";
import { backToMenu } from "../keyboards.ts";

export async function calendarCommand(ctx: Context) {
  try {
    const today = new Date();
    const startDate = today.toISOString().split("T")[0];
    const days = 7; // Next 7 days

    // Get user's calendar if authenticated, otherwise global calendar
    let showsRes, moviesRes;

    if (ctx.traktToken) {
      [showsRes, moviesRes] = await Promise.all([
        trakt.calendars.shows({
          query: { start_date: startDate, days },
          headers: { Authorization: `Bearer ${ctx.traktToken.accessToken}` },
        }),
        trakt.calendars.movies({
          query: { start_date: startDate, days },
          headers: { Authorization: `Bearer ${ctx.traktToken.accessToken}` },
        }),
      ]);
    } else {
      // Use public calendar (my shows)
      [showsRes, moviesRes] = await Promise.all([
        trakt.calendars.shows({
          query: { start_date: startDate, days, type: "my" },
        }),
        trakt.calendars.movies({
          query: { start_date: startDate, days, type: "my" },
        }),
      ]);
    }

    let message = "📅 **التقويم - الأسبوع القادم**\n\n";
    const keyboard = [];

    if (showsRes.status === 200 && showsRes.body.length > 0) {
      message += "📺 **مسلسلات قادمة:**\n\n";
      for (const entry of showsRes.body.slice(0, 10)) {
        if (entry.show) {
          const airDate = entry.first_aired
            ? new Date(entry.first_aired).toLocaleDateString("ar-SA")
            : "?";
          message += `• **${entry.show.title}** - S${entry.season}E${entry.episode}\n`;
          message += `  📅 ${airDate}\n`;
          keyboard.push([
            { text: `📺 ${entry.show.title}`, callback_data: `detail:${entry.show.ids?.slug}` },
          ]);
        }
      }
    }

    if (moviesRes.status === 200 && moviesRes.body.length > 0) {
      message += "\n🎬 **أفلام قادمة:**\n\n";
      for (const entry of moviesRes.body.slice(0, 10)) {
        if (entry.movie) {
          const releaseDate = entry.released
            ? new Date(entry.released).toLocaleDateString("ar-SA")
            : "?";
          message += `• **${entry.movie.title}** (${entry.movie.year || "?"})\n`;
          message += `  📅 ${releaseDate}\n`;
          keyboard.push([
            { text: `🎬 ${entry.movie.title}`, callback_data: `detail:${entry.movie.ids?.slug}` },
          ]);
        }
      }
    }

    if (
      (!showsRes.body || showsRes.body.length === 0) &&
      (!moviesRes.body || moviesRes.body.length === 0)
    ) {
      message += "لا يوجد محتوى قادم في الأسبوع القادم.\n";
      message += "\n💡 ربط حسابك بـ Trakt يعرض مسلسلاتك المفضلة!";
    }

    keyboard.push([{ text: "🔙 القائمة الرئيسية", callback_data: "back_to_menu" }]);

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard },
    });
  } catch (error) {
    console.error("Calendar error:", error);
    await ctx.reply("❌ حدث خطأ أثناء تحميل التقويم.");
  }
}
