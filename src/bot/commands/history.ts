import { Context } from "grammy";
import { trakt } from "../../trakt/client.ts";
import { getMovieImages, getShowImages, getPosterUrl } from "../../trakt/images.ts";
import { backToMenu } from "../keyboards.ts";

export async function historyCommand(ctx: Context, page = 1) {
  if (!ctx.traktToken) {
    await ctx.reply(
      "🔒 هذا الأمر يتطلب ربط حساب Trakt.\n\nاستخدم /start للربط.",
    );
    return;
  }

  try {
    const [moviesRes, showsRes] = await Promise.all([
      trakt.sync.history.get({
        params: { type: "movies", id: "" },
        query: { page, limit: 10 },
        headers: { Authorization: `Bearer ${ctx.traktToken.accessToken}` },
      }),
      trakt.sync.history.get({
        params: { type: "shows", id: "" },
        query: { page, limit: 10 },
        headers: { Authorization: `Bearer ${ctx.traktToken.accessToken}` },
      }),
    ]);

    const allEntries = [
      ...(moviesRes.body || []),
      ...(showsRes.body || []),
    ].sort((a, b) => {
      const dateA = a.watched_at ? new Date(a.watched_at).getTime() : 0;
      const dateB = b.watched_at ? new Date(b.watched_at).getTime() : 0;
      return dateB - dateA;
    }).slice(0, 10);

    if (allEntries.length === 0) {
      await ctx.reply(
        "📺 **سجل المشاهدة فارغ**\n\nابدأ بمشاهدة محتوى لتسجيله هنا!",
        { parse_mode: "Markdown", reply_markup: backToMenu() },
      );
      return;
    }

    const allItems: Array<{
      title: string;
      watched_at: string | null;
      action: string;
      slug: string;
      images: Awaited<ReturnType<typeof getMovieImages>>;
    }> = [];

    for (const entry of allEntries) {
      const movie = entry.movie;
      const show = entry.show;
      const title = movie?.title || show?.title || entry.episode?.title || entry.type;
      const slug = movie?.ids?.slug || show?.ids?.slug || "";
      const images = movie
        ? await getMovieImages(slug, ctx.traktToken.accessToken)
        : await getShowImages(slug, ctx.traktToken.accessToken);
      allItems.push({
        title,
        watched_at: entry.watched_at,
        action: entry.action,
        slug,
        images,
      });
    }

    const first = allItems[0];
    const posterUrl = getPosterUrl(first?.images);
    const caption = `📺 **سجل المشاهدة** (صفحة ${page})\n\n${allItems.map((item) => {
      const date = item.watched_at ? new Date(item.watched_at).toLocaleDateString("ar-SA") : "";
      return `• **${item.title}** - ${item.action}\n   📅 ${date}`;
    }).join("\n")}`;

    const keyboard: Array<Array<{ text: string; callback_data: string }>> = [];
    for (const item of allItems) {
      if (item.slug) {
        keyboard.push([
          { text: `ℹ️ ${item.title}`, callback_data: `detail:${item.slug}` },
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
    console.error("History error:", error);
    await ctx.reply("❌ حدث خطأ أثناء تحميل سجل المشاهدة.");
  }
}

export async function addToHistory(ctx: Context, slug: string) {
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

    const res = await trakt.sync.history.add({
      body: { movies: found.movie ? [{ ids }] : [], shows: found.show ? [{ ids }] : [] },
      headers: { Authorization: `Bearer ${ctx.traktToken.accessToken}` },
    });

    if (res.status === 200) {
      const title = found.movie?.title || found.show?.title;
      await ctx.reply(`✅ تمت إضافة **${title}** إلى سجل المشاهدة.`, {
        parse_mode: "Markdown",
      });
    } else {
      await ctx.reply("❌ حدث خطأ أثناء الإضافة.");
    }
  } catch (error) {
    console.error("History add error:", error);
    await ctx.reply("❌ حدث خطأ أثناء الإضافة.");
  }
}
