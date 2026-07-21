import { Context } from "grammy";
import { trakt } from "../../trakt/client.ts";
import { movieKeyboard, showKeyboard, backToMenu } from "../keyboards.ts";

export async function searchCommand(ctx: Context) {
  const query = ctx.message?.text?.replace("/search ", "").replace("/search", "").trim();

  if (!query) {
    await ctx.reply(
      "🔍 **البحث**\n\nاستخدم الأمر مع كلمة البحث:\n`/search batman`",
      { parse_mode: "Markdown" },
    );
    return;
  }

  await ctx.reply("🔍 جاري البحث...");

  try {
    const [moviesRes, showsRes] = await Promise.all([
      trakt.search({ query: { query, type: "movie", limit: 5 } }),
      trakt.search({ query: { query, type: "show", limit: 5 } }),
    ]);

    let message = `🔍 نتائج البحث: "${query}"\n\n`;
    let hasResults = false;

    if (moviesRes.status === 200 && moviesRes.body.length > 0) {
      message += "🎬 **أفلام:**\n\n";
      for (const item of moviesRes.body) {
        if (item.movie) {
          const m = item.movie;
          message += `• **${m.title}** (${m.year || "?"})\n`;
          message += `  ⭐ ${m.rating || "N/A"} | 👥 ${m.votes?.toLocaleString() || "0"} votes\n`;
          hasResults = true;
        }
      }
    }

    if (showsRes.status === 200 && showsRes.body.length > 0) {
      message += "\n📺 **مسلسلات:**\n\n";
      for (const item of showsRes.body) {
        if (item.show) {
          const s = item.show;
          message += `• **${s.title}** (${s.year || "?"})\n`;
          message += `  ⭐ ${s.rating || "N/A"} | 👥 ${s.votes?.toLocaleString() || "0"} votes\n`;
          hasResults = true;
        }
      }
    }

    if (!hasResults) {
      await ctx.reply("❌ لم يتم العثور على نتائج.", {
        reply_markup: backToMenu(),
      });
      return;
    }

    await ctx.reply(message, { parse_mode: "Markdown" });

    // Show buttons for each result
    const keyboard = [];
    if (moviesRes.status === 200 && moviesRes.body.length > 0) {
      for (const item of moviesRes.body) {
        if (item.movie) {
          keyboard.push([
            { text: `🎬 ${item.movie.title}`, callback_data: `detail:${item.movie.ids?.slug}` },
          ]);
        }
      }
    }
    if (showsRes.status === 200 && showsRes.body.length > 0) {
      for (const item of showsRes.body) {
        if (item.show) {
          keyboard.push([
            { text: `📺 ${item.show.title}`, callback_data: `detail:${item.show.ids?.slug}` },
          ]);
        }
      }
    }

    if (keyboard.length > 0) {
      keyboard.push([{ text: "🔙 القائمة الرئيسية", callback_data: "back_to_menu" }]);
      await ctx.reply("اختر للتفاصيل:", {
        reply_markup: { inline_keyboard: keyboard },
      });
    }
  } catch (error) {
    console.error("Search error:", error);
    await ctx.reply("❌ حدث خطأ أثناء البحث. حاول مرة أخرى.");
  }
}
