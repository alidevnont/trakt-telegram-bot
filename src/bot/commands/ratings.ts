import { Context } from "grammy";
import { trakt } from "../../trakt/client.ts";
import { getMovieImages, getShowImages, getPosterUrl } from "../../trakt/images.ts";
import { ratingKeyboard, backToMenu } from "../keyboards.ts";

export async function ratingsCommand(ctx: Context) {
  if (!ctx.traktToken) {
    await ctx.reply(
      "🔒 هذا الأمر يتطلب ربط حساب Trakt.\n\nاستخدم /start للربط.",
    );
    return;
  }

  try {
    const [moviesRes, showsRes] = await Promise.all([
      trakt.sync.ratings.get({
        params: { type: "movie", rating: "1,2,3,4,5,6,7,8,9,10" },
        headers: { Authorization: `Bearer ${ctx.traktToken.accessToken}` },
      }),
      trakt.sync.ratings.get({
        params: { type: "show", rating: "1,2,3,4,5,6,7,8,9,10" },
        headers: { Authorization: `Bearer ${ctx.traktToken.accessToken}` },
      }),
    ]);

    const allItems: Array<{
      type: "movie" | "show";
      title: string;
      rating: number;
      slug: string;
      images: Awaited<ReturnType<typeof getMovieImages>>;
    }> = [];

    if (moviesRes.status === 200 && moviesRes.body.length > 0) {
      for (const entry of moviesRes.body.slice(0, 5)) {
        const slug = entry.movie?.ids?.slug || "";
        const images = slug ? await getMovieImages(slug, ctx.traktToken.accessToken) : null;
        allItems.push({
          type: "movie",
          title: entry.movie?.title || "Unknown",
          rating: entry.rating,
          slug,
          images,
        });
      }
    }

    if (showsRes.status === 200 && showsRes.body.length > 0) {
      for (const entry of showsRes.body.slice(0, 5)) {
        const slug = entry.show?.ids?.slug || "";
        const images = slug ? await getShowImages(slug, ctx.traktToken.accessToken) : null;
        allItems.push({
          type: "show",
          title: entry.show?.title || "Unknown",
          rating: entry.rating,
          slug,
          images,
        });
      }
    }

    if (allItems.length === 0) {
      await ctx.reply(
        "⭐ **لا توجد تقييمات**\n\nقيّم الأفلام والمسلسلات التي شاهدتها!",
        { parse_mode: "Markdown", reply_markup: backToMenu() },
      );
      return;
    }

    const first = allItems[0];
    const posterUrl = getPosterUrl(first?.images);
    const caption = `⭐ **تقييماتك**\n\n${allItems.map((item) => {
      const icon = item.type === "movie" ? "🎬" : "📺";
      const stars = "⭐".repeat(Math.round(item.rating / 2));
      return `${icon} **${item.title}** - ${stars} (${item.rating}/10)`;
    }).join("\n")}`;

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
    console.error("Ratings error:", error);
    await ctx.reply("❌ حدث خطأ أثناء تحميل التقييمات.");
  }
}

export async function rateItem(ctx: Context, slug: string, rating?: number) {
  if (!ctx.traktToken) {
    await ctx.reply("🔒 هذا الأمر يتطلب ربط حساب Trakt.");
    return;
  }

  if (!rating) {
    await ctx.reply("⭐ اختر تقييمك:", {
      reply_markup: ratingKeyboard(slug),
    });
    return;
  }

  try {
    const searchRes = await trakt.search.query({
      params: { type: "movie" },
      query: { query: slug, limit: 1 },
    });
    const searchResShow = await trakt.search.query({
      params: { type: "show" },
      query: { query: slug, limit: 1 },
    });

    const searchResults = [...(searchRes.body || []), ...(searchResShow.body || [])];
    if (searchResults.length === 0) {
      await ctx.reply("❌ لم يتم العثور على العنصر.");
      return;
    }

    const found = searchResults[0];
    const ids = found.movie?.ids || found.show?.ids;

    if (!ids) {
      await ctx.reply("❌ لم يتم العثور على العنصر.");
      return;
    }

    const res = await trakt.sync.ratings.add({
      body: { movies: found.movie ? [{ ids, rating }] : [], shows: found.show ? [{ ids, rating }] : [] },
      headers: { Authorization: `Bearer ${ctx.traktToken.accessToken}` },
    });

    if (res.status === 201) {
      const title = found.movie?.title || found.show?.title;
      await ctx.reply(
        `✅ تمت تقييم **${title}** بـ ${"⭐".repeat(Math.round(rating / 2))} (${rating}/10)`,
        { parse_mode: "Markdown" },
      );
    } else {
      await ctx.reply("❌ حدث خطأ أثناء التقييم.");
    }
  } catch (error) {
    console.error("Rate error:", error);
    await ctx.reply("❌ حدث خطأ أثناء التقييم.");
  }
}
