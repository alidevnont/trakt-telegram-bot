import { Context } from "grammy";
import { trakt } from "../../trakt/client.ts";
import { getMovieImages, getShowImages, getPosterUrl } from "../../trakt/images.ts";
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

    const allItems: Array<{
      type: "movie" | "show";
      title: string;
      year: number | null;
      rating: number | null;
      slug: string;
      images: Awaited<ReturnType<typeof getMovieImages>>;
    }> = [];

    if (moviesRes.status === 200 && moviesRes.body.length > 0) {
      for (const movie of moviesRes.body.slice(0, 3)) {
        if (movie.ids?.slug) {
          const images = await getMovieImages(movie.ids.slug, ctx.traktToken.accessToken);
          allItems.push({
            type: "movie",
            title: movie.title || "Unknown",
            year: movie.year,
            rating: movie.rating,
            slug: movie.ids.slug,
            images,
          });
        }
      }
    }

    if (showsRes.status === 200 && showsRes.body.length > 0) {
      for (const show of showsRes.body.slice(0, 3)) {
        if (show.ids?.slug) {
          const images = await getShowImages(show.ids.slug, ctx.traktToken.accessToken);
          allItems.push({
            type: "show",
            title: show.title || "Unknown",
            year: show.year,
            rating: show.rating,
            slug: show.ids.slug,
            images,
          });
        }
      }
    }

    if (allItems.length === 0) {
      await ctx.reply(
        "❌ لا توجد توصيات حالياً.",
        { reply_markup: backToMenu() },
      );
      return;
    }

    const first = allItems[0];
    const posterUrl = getPosterUrl(first.images);
    const caption = `🎯 **توصياتك الشخصية**\n\n${allItems.map((item) => {
      const icon = item.type === "movie" ? "🎬" : "📺";
      const stars = item.rating ? "⭐".repeat(Math.round(item.rating / 2)) : "";
      return `${icon} **${item.title}** (${item.year || "?"})\n⭐ ${item.rating || "N/A"} ${stars}`;
    }).join("\n\n")}`;

    const keyboard: Array<Array<{ text: string; callback_data: string }>> = [];
    for (const item of allItems) {
      const icon = item.type === "movie" ? "🎬" : "📺";
      keyboard.push([
        { text: `${icon} ${item.title}`, callback_data: `detail:${item.slug}` },
      ]);
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
    console.error("Recommendations error:", error);
    await ctx.reply("❌ حدث خطأ أثناء تحميل التوصيات.");
  }
}
