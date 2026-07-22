import { Context } from "grammy";
import { trakt } from "../../trakt/client.ts";
import { backToMenu } from "../keyboards.ts";

export async function historyCommand(ctx: Context, page = 1) {
  if (!ctx.traktToken) {
    await ctx.reply(
      "🔒 هذا الأمر يتطلب ربط حساب Trakt.\n\nاستخدم /start للربط.",
    );
    return;
  }

  try {
    const res = await trakt.sync.history.get({
      params: { type: "movies", id: "0" },
      query: { page, limit: 10 },
      headers: { Authorization: `Bearer ${ctx.traktToken.accessToken}` },
    });

    if (res.status !== 200 || res.body.length === 0) {
      await ctx.reply(
        "📺 **سجل المشاهدة فارغ**\n\nابدأ بمشاهدة محتوى لتسجيله هنا!",
        { parse_mode: "Markdown", reply_markup: backToMenu() },
      );
      return;
    }

    let message = `📺 **سجل المشاهدة** (صفحة ${page})\n\n`;
    const keyboard = [];

    for (const entry of res.body) {
      const watched = entry.watched_at
        ? new Date(entry.watched_at).toLocaleDateString("ar-SA")
        : "";
      const icon = entry.type === "movie" ? "🎬" : "📺";
      const title = entry.movie?.title || entry.show?.title || entry.episode?.title || entry.type;
      message += `${icon} **${title}** - ${entry.action}\n`;
      message += `   📅 ${watched}\n`;
    }

    keyboard.push([{ text: "🔙 القائمة الرئيسية", callback_data: "back_to_menu" }]);

    await ctx.reply(message, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard },
    });
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
