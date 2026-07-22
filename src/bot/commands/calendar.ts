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
        headers: ctx.traktToken
          ? { Authorization: `Bearer ${ctx.traktToken.accessToken}` }
          : {},
      }),
      trakt.calendars.movies({
        params: { target, start_date: startDate, days: days.toString() },
        headers: ctx.traktToken
          ? { Authorization: `Bearer ${ctx.traktToken.accessToken}` }
          : {},
      }),
    ]);

    const allItems: Array<{
      type: "show" | "movie";
      title: string;
      date: string;
      slug: string;
      images: Awaited<ReturnType<typeof getMovieImages>>;
    }> = [];

    if (showsRes.status === 200 && showsRes.body.length > 0) {
      for (const entry of showsRes.body.slice(0, 5)) {
        const slug = entry.show?.ids?.slug || "";
        const images = slug ? await getShowImages(slug, ctx.traktToken?.accessToken) : null;
        allItems.push({
          type: "show",
          title: entry.show?.title || "Unknown",
          date: entry.first_aired
            ? new Date(entry.first_aired).toLocaleDateString("ar-SA")
            : "?",
          slug,
          images,
        });
      }
    }

    if (moviesRes.status === 200 && moviesRes.body.length > 0) {
      for (const entry of moviesRes.body.slice(0, 5)) {
        const slug = entry.movie?.ids?.slug || "";
        const images = slug ? await getMovieImages(slug, ctx.traktToken?.accessToken) : null;
        allItems.push({
          type: "movie",
          title: entry.movie?.title || "Unknown",
          date: entry.released
            ? new Date(entry.released).toLocaleDateString("ar-SA")
            : "?",
          slug,
          images,
        });
      }
    }

    if (allItems.length === 0) {
      await ctx.reply(
        "📅 **التقويم - الأسبوع القادم**\n\nلا يوجد محتوى قادم في الأسبوع القادم.",
        { parse_mode: "Markdown", reply_markup: backToMenu() },
      );
      return;
    }

    const first = allItems[0];
    const posterUrl = getPosterUrl(first?.images);
    const caption = `📅 **التقويم - الأسبوع القادم**\n\n${allItems.map((item) => {
      const icon = item.type === "show" ? "📺" : "🎬";
      return `${icon} **${item.title}**\n   📅 ${item.date}`;
    }).join("\n")}`;

    const keyboard: Array<Array<{ text: string; callback_data: string }>> = [];
    for (const item of allItems) {
      const icon = item.type === "show" ? "📺" : "🎬";
      if (item.slug) {
        keyboard.push([
          { text: `${icon} ${item.title}`, callback_data: `detail:${item.slug}` },
        ]);
      }
    }
    keyboard.push([{ text: "🔙 القائمة الرئيسية", callback_data: "back_to_menu" }]);

    if (posterUrl) {
      await ctx.api.sendPhoto(ctx.chat!.id, posterUrl, {
        caption,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard },
      });
    } else {
      await ctx.reply(caption, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard },
      });
    }
  } catch (error) {
    console.error("Calendar error:", error);
    await ctx.reply("❌ حدث خطأ أثناء تحميل التقويم.");
  }
}
