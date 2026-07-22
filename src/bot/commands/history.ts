import { Context } from "grammy";
import { trakt } from "../../trakt/client.ts";
import { getMovieImages, getShowImages, getPosterUrl } from "../../trakt/images.ts";
import { backToMenu } from "../keyboards.ts";

export async function historyCommand(ctx: Context, page = 1) {
  if (!ctx.traktToken) {
    await ctx.reply("🔒 هذا الأمر يتطلب ربط حساب Trakt.\n\nاستخدم /start للربط.");
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

    // Get poster for first item
    const first = allEntries[0];
    const firstSlug = first.movie?.ids?.slug || first.show?.ids?.slug || "";
    const firstImages = first.movie
      ? await getMovieImages(firstSlug, ctx.traktToken.accessToken)
      : await getShowImages(firstSlug, ctx.traktToken.accessToken);
    const posterUrl = getPosterUrl(firstImages);

    const lines: string[] = [];
    const kb: Array<Array<{ text: string; callback_data: string }>> = [];

    for (const entry of allEntries) {
      const title = entry.movie?.title || entry.show?.title || entry.episode?.title || "Unknown";
      const slug = entry.movie?.ids?.slug || entry.show?.ids?.slug || "";
      const date = entry.watched_at ? new Date(entry.watched_at).toLocaleDateString("ar-SA") : "";
      lines.push(`• **${title}** - ${entry.action}\n   📅 ${date}`);
      if (slug) kb.push([{ text: `ℹ️ ${title}`, callback_data: `detail:${slug}` }]);
    }

    kb.push([{ text: "🔙 القائمة الرئيسية", callback_data: "back_to_menu" }]);

    const caption = `📺 **سجل المشاهدة** (صفحة ${page})\n\n${lines.join("\n")}`;

    if (posterUrl) {
      await ctx.api.sendPhoto(ctx.chat!.id, posterUrl, {
        caption, parse_mode: "Markdown", reply_markup: { inline_keyboard: kb },
      });
    } else {
      await ctx.reply(caption, { parse_mode: "Markdown", reply_markup: { inline_keyboard: kb } });
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

    const res = await trakt.sync.history.add({
      body: { movies: found.movie ? [{ ids }] : [], shows: found.show ? [{ ids }] : [] },
      headers: { Authorization: `Bearer ${ctx.traktToken.accessToken}` },
    });

    const title = found.movie?.title || found.show?.title;
    if (res.status === 200) {
      await ctx.reply(`✅ تمت إضافة **${title}** إلى سجل المشاهدة.`, { parse_mode: "Markdown" });
    } else {
      await ctx.reply("❌ حدث خطأ أثناء الإضافة.");
    }
  } catch (error) {
    console.error("History add error:", error);
    await ctx.reply("❌ حدث خطأ أثناء الإضافة.");
  }
}
