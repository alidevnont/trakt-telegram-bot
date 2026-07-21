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
    const res = await trakt.sync.history({
      query: { type: "movie,show", page, limit: 10 },
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
      if (entry.movie) {
        const m = entry.movie;
        const watched = entry.watched_at
          ? new Date(entry.watched_at).toLocaleDateString("ar-SA")
          : "";
        message += `🎬 **${m.title}** (${m.year || "?"})\n`;
        message += `   📅 ${watched} | ▶️ ${entry.plays || 1} مرة\n`;
        keyboard.push([
          { text: `🎬 ${m.title}`, callback_data: `detail:${m.ids?.slug}` },
        ]);
      } else if (entry.show) {
        const s = entry.show;
        const watched = entry.watched_at
          ? new Date(entry.watched_at).toLocaleDateString("ar-SA")
          : "";
        message += `📺 **${s.title}** (${s.year || "?"})\n`;
        message += `   📅 ${watched}\n`;
        keyboard.push([
          { text: `📺 ${s.title}`, callback_data: `detail:${s.ids?.slug}` },
        ]);
      }
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
    const searchRes = await trakt.search({
      query: { query: slug, type: "movie,show" },
    });

    if (searchRes.status !== 200 || searchRes.body.length === 0) {
      await ctx.reply("❌ لم يتم العثور على العنصر.");
      return;
    }

    const item = searchRes.body[0];
    const type = item.movie ? "movies" : "shows";
    const ids = item.movie?.ids || item.show?.ids;

    if (!ids) {
      await ctx.reply("❌ لم يتم العثور على العنصر.");
      return;
    }

    const res = await trakt.sync.historyAdd({
      body: { [type]: [{ ids, watched_at: new Date().toISOString() }] },
      headers: { Authorization: `Bearer ${ctx.traktToken.accessToken}` },
    });

    if (res.status === 201) {
      const title = item.movie?.title || item.show?.title;
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
