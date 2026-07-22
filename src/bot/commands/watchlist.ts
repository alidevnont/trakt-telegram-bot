import { Context } from "grammy";
import { trakt } from "../../trakt/client.ts";
import { getMovieImages, getShowImages, getPosterUrl } from "../../trakt/images.ts";
import { backToMenu } from "../keyboards.ts";

export async function watchlistCommand(ctx: Context, page = 1) {
  if (!ctx.traktToken) {
    await ctx.reply(
      "🔒 هذا الأمر يتطلب ربط حساب Trakt.\n\nاستخدم /start للربط.",
    );
    return;
  }

  try {
    const res = await trakt.sync.watchlist.get({
      params: { type: "movie,show", sort_by: "added", sort_how: "desc" },
      query: { page, limit: 5 },
      headers: { Authorization: `Bearer ${ctx.traktToken.accessToken}` },
    });

    if (res.status !== 200 || res.body.length === 0) {
      await ctx.reply(
        "📋 **قائمة المشاهدة فارغة**\n\nأضف أفلام أو مسلسلات باستخدام الأمر:\n`/search <اسم>`",
        { parse_mode: "Markdown", reply_markup: backToMenu() },
      );
      return;
    }

    const allItems: Array<{
      type: string;
      title: string;
      slug: string;
      listed_at: string | null;
      images: Awaited<ReturnType<typeof getMovieImages>>;
    }> = [];

    for (const item of res.body) {
      const movie = item.movie;
      const show = item.show;
      const title = movie?.title || show?.title || item.episode?.title || item.type;
      const slug = movie?.ids?.slug || show?.ids?.slug || "";
      const images = movie
        ? await getMovieImages(slug, ctx.traktToken.accessToken)
        : await getShowImages(slug, ctx.traktToken.accessToken);
      allItems.push({
        type: item.type,
        title,
        slug,
        listed_at: item.listed_at,
        images,
      });
    }

    const first = allItems[0];
    const posterUrl = getPosterUrl(first?.images);
    const caption = `📋 **قائمة المشاهدة** (صفحة ${page})\n\n${allItems.map((item) => {
      const icon = item.type === "movie" ? "🎬" : "📺";
      const date = item.listed_at ? new Date(item.listed_at).toLocaleDateString("ar-SA") : "";
      return `${icon} **${item.title}** - ${date}`;
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
    console.error("Watchlist error:", error);
    await ctx.reply("❌ حدث خطأ أثناء تحميل قائمة المشاهدة.");
  }
}

export async function watchlistAdd(ctx: Context, slug: string) {
  if (!ctx.traktToken) {
    await ctx.reply("🔒 هذا الأمر يتطلب ربط حساب Trakt.");
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

    const res = await trakt.sync.watchlist.add({
      body: { movies: found.movie ? [{ ids }] : [], shows: found.show ? [{ ids }] : [] },
      headers: { Authorization: `Bearer ${ctx.traktToken.accessToken}` },
    });

    if (res.status === 201) {
      const title = found.movie?.title || found.show?.title;
      await ctx.reply(`✅ تمت إضافة **${title}** إلى قائمة المشاهدة.`, {
        parse_mode: "Markdown",
      });
    } else {
      await ctx.reply("❌ حدث خطأ أثناء الإضافة.");
    }
  } catch (error) {
    console.error("Watchlist add error:", error);
    await ctx.reply("❌ حدث خطأ أثناء الإضافة.");
  }
}

export async function watchlistRemove(ctx: Context, slug: string) {
  if (!ctx.traktToken) {
    await ctx.reply("🔒 هذا الأمر يتطلب ربط حساب Trakt.");
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

    const res = await trakt.sync.watchlist.remove({
      body: { movies: found.movie ? [{ ids }] : [], shows: found.show ? [{ ids }] : [] },
      headers: { Authorization: `Bearer ${ctx.traktToken.accessToken}` },
    });

    if (res.status === 200) {
      const title = found.movie?.title || found.show?.title;
      await ctx.reply(`✅ تمت إزالة **${title}** من قائمة المشاهدة.`, {
        parse_mode: "Markdown",
      });
    } else {
      await ctx.reply("❌ حدث خطأ أثناء الإزالة.");
    }
  } catch (error) {
    console.error("Watchlist remove error:", error);
    await ctx.reply("❌ حدث خطأ أثناء الإزالة.");
  }
}
