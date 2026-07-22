import { Context } from "grammy";
import { trakt } from "../../trakt/client.ts";
import { getShowImages, getMovieImages, getPosterUrl } from "../../trakt/images.ts";
import { backToMenu } from "../keyboards.ts";

export async function calendarCommand(ctx: Context) {
  try {
    const today = new Date();
    const startDate = today.toISOString().split("T")[0];
    const days = 7;
    const target = ctx.traktToken ? "my" : "all";

    const [showsRes, moviesRes] = await Promise.all([
      trakt.calendars.shows({
        params: { target, start_date: startDate, days: days.toString() },
        headers: ctx.traktToken ? { Authorization: `Bearer ${ctx.traktToken.accessToken}` } : {},
      }),
      trakt.calendars.movies({
        params: { target, start_date: startDate, days: days.toString() },
        headers: ctx.traktToken ? { Authorization: `Bearer ${ctx.traktToken.accessToken}` } : {},
      }),
    ]);

    const lines: string[] = [];
    const kb: Array<Array<{ text: string; callback_data: string }>> = [];
    let posterUrl: string | null = null;

    if (showsRes.status === 200 && showsRes.body.length > 0) {
      for (const entry of showsRes.body.slice(0, 5)) {
        const title = entry.show?.title || "Unknown";
        const slug = entry.show?.ids?.slug || "";
        const airDate = entry.first_aired ? new Date(entry.first_aired).toLocaleDateString("ar-SA") : "?";
        lines.push(`📺 **${title}**\n   📅 ${airDate}`);
        if (slug) kb.push([{ text: `📺 ${title}`, callback_data: `detail:${slug}` }]);
        if (!posterUrl && slug) {
          const imgs = await getShowImages(slug, ctx.traktToken?.accessToken);
          posterUrl = getPosterUrl(imgs);
        }
      }
    }

    if (moviesRes.status === 200 && moviesRes.body.length > 0) {
      for (const entry of moviesRes.body.slice(0, 5)) {
        const title = entry.movie?.title || "Unknown";
        const slug = entry.movie?.ids?.slug || "";
        const releaseDate = entry.released ? new Date(entry.released).toLocaleDateString("ar-SA") : "?";
        lines.push(`🎬 **${title}**\n   📅 ${releaseDate}`);
        if (slug) kb.push([{ text: `🎬 ${title}`, callback_data: `detail:${slug}` }]);
        if (!posterUrl && slug) {
          const imgs = await getMovieImages(slug, ctx.traktToken?.accessToken);
          posterUrl = getPosterUrl(imgs);
        }
      }
    }

    if (lines.length === 0) {
      await ctx.reply("📅 **التقويم - الأسبوع القادم**\n\nلا يوجد محتوى قادم.", {
        parse_mode: "Markdown", reply_markup: backToMenu(),
      });
      return;
    }

    kb.push([{ text: "🔙 القائمة الرئيسية", callback_data: "back_to_menu" }]);
    const caption = `📅 **التقويم - الأسبوع القادم**\n\n${lines.join("\n")}`;

    if (posterUrl) {
      await ctx.api.sendPhoto(ctx.chat!.id, posterUrl, {
        caption, parse_mode: "Markdown", reply_markup: { inline_keyboard: kb },
      });
    } else {
      await ctx.reply(caption, { parse_mode: "Markdown", reply_markup: { inline_keyboard: kb } });
    }
  } catch (error) {
    console.error("Calendar error:", error);
    await ctx.reply("❌ حدث خطأ أثناء تحميل التقويم.");
  }
}
