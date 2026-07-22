import { Context } from "grammy";
import { trakt } from "../../trakt/client.ts";
import { getMovieImages, getShowImages, getPosterUrl } from "../../trakt/images.ts";
import { ratingKeyboard, backToMenu } from "../keyboards.ts";

export async function ratingsCommand(ctx: Context) {
  if (!ctx.traktToken) {
    await ctx.reply("🔒 هذا الأمر يتطلب ربط حساب Trakt.\n\nاستخدم /start للربط.");
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

    const lines: string[] = [];
    const kb: Array<Array<{ text: string; callback_data: string }>> = [];
    let posterUrl: string | null = null;

    if (moviesRes.status === 200 && moviesRes.body.length > 0) {
      for (const entry of moviesRes.body.slice(0, 5)) {
        const slug = entry.movie?.ids?.slug || "";
        const title = entry.movie?.title || "Unknown";
        const stars = "⭐".repeat(Math.round(entry.rating / 2));
        lines.push(`🎬 **${title}** - ${stars} (${entry.rating}/10)`);
        kb.push([{ text: `🎬 ${title}`, callback_data: `detail:${slug}` }]);
        if (!posterUrl && slug) {
          const imgs = await getMovieImages(slug, ctx.traktToken.accessToken);
          posterUrl = getPosterUrl(imgs);
        }
      }
    }

    if (showsRes.status === 200 && showsRes.body.length > 0) {
      for (const entry of showsRes.body.slice(0, 5)) {
        const slug = entry.show?.ids?.slug || "";
        const title = entry.show?.title || "Unknown";
        const stars = "⭐".repeat(Math.round(entry.rating / 2));
        lines.push(`📺 **${title}** - ${stars} (${entry.rating}/10)`);
        kb.push([{ text: `📺 ${title}`, callback_data: `detail:${slug}` }]);
        if (!posterUrl && slug) {
          const imgs = await getShowImages(slug, ctx.traktToken.accessToken);
          posterUrl = getPosterUrl(imgs);
        }
      }
    }

    if (lines.length === 0) {
      await ctx.reply("⭐ **لا توجد تقييمات**\n\nقيّم الأفلام والمسلسلات التي شاهدتها!", {
        parse_mode: "Markdown", reply_markup: backToMenu(),
      });
      return;
    }

    kb.push([{ text: "🔙 القائمة الرئيسية", callback_data: "back_to_menu" }]);
    const caption = `⭐ **تقييماتك**\n\n${lines.join("\n")}`;

    if (posterUrl) {
      await ctx.api.sendPhoto(ctx.chat!.id, posterUrl, {
        caption, parse_mode: "Markdown", reply_markup: { inline_keyboard: kb },
      });
    } else {
      await ctx.reply(caption, { parse_mode: "Markdown", reply_markup: { inline_keyboard: kb } });
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
    await ctx.reply("⭐ اختر تقييمك:", { reply_markup: ratingKeyboard(slug) });
    return;
  }

  try {
    const searchRes = await trakt.search.query({
      params: { type: "movie" },
      query: { query: slug, limit: 1, extended: "full,images" },
    });
    const searchResShow = await trakt.search.query({
      params: { type: "show" },
      query: { query: slug, limit: 1, extended: "full,images" },
    });

    const all = [...(searchRes.body || []), ...(searchResShow.body || [])];
    if (all.length === 0) { await ctx.reply("❌ لم يتم العثور على العنصر."); return; }

    const found = all[0];
    const ids = found.movie?.ids || found.show?.ids;
    if (!ids) { await ctx.reply("❌ لم يتم العثور على العنصر."); return; }

    const res = await trakt.sync.ratings.add({
      body: { movies: found.movie ? [{ ids, rating }] : [], shows: found.show ? [{ ids, rating }] : [] },
      headers: { Authorization: `Bearer ${ctx.traktToken.accessToken}` },
    });

    const title = found.movie?.title || found.show?.title;
    if (res.status === 201) {
      await ctx.reply(`✅ تمت تقييم **${title}** بـ ${"⭐".repeat(Math.round(rating / 2))} (${rating}/10)`, {
        parse_mode: "Markdown",
      });
    } else {
      await ctx.reply("❌ حدث خطأ أثناء التقييم.");
    }
  } catch (error) {
    console.error("Rate error:", error);
    await ctx.reply("❌ حدث خطأ أثناء التقييم.");
  }
}
