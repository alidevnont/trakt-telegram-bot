import { Context } from "grammy";
import { trakt } from "../../trakt/client.ts";
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

    let message = `📋 **قائمة المشاهدة** (صفحة ${page})\n\n`;
    const keyboard = [];

    for (const item of res.body) {
      const title = item.movie?.title || item.show?.title || item.episode?.title || item.type;
      const icon = item.type === "movie" ? "🎬" : "📺";
      message += `${icon} **${title}** - ${item.listed_at ? new Date(item.listed_at).toLocaleDateString("ar-SA") : ""}\n`;
    }

    keyboard.push([{ text: "🔙 القائمة الرئيسية", callback_data: "back_to_menu" }]);

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard },
    });
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
