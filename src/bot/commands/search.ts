import { Context } from "grammy";
import { trakt } from "../../trakt/client.ts";
import { backToMenu } from "../keyboards.ts";

interface SearchResultItem {
  type: "movie" | "show";
  title: string;
  year: number | null;
  rating: number | null;
  slug: string;
  posterUrl: string | null;
}

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
      trakt.search.query({
        params: { type: "movie" },
        query: { query, limit: 5, extended: "full,images" },
      }),
      trakt.search.query({
        params: { type: "show" },
        query: { query, limit: 5, extended: "full,images" },
      }),
    ]);

    const allItems: SearchResultItem[] = [];

    if (moviesRes.status === 200 && moviesRes.body.length > 0) {
      for (const item of moviesRes.body) {
        if (item.movie) {
          const images = (item.movie as Record<string, unknown>).images as Record<string, Record<string, string>> | undefined;
          const posterUrl = images?.poster?.full || images?.poster?.medium || null;
          allItems.push({
            type: "movie",
            title: item.movie.title || "Unknown",
            year: item.movie.year,
            rating: item.movie.rating,
            slug: item.movie.ids?.slug || "",
            posterUrl,
          });
        }
      }
    }

    if (showsRes.status === 200 && showsRes.body.length > 0) {
      for (const item of showsRes.body) {
        if (item.show) {
          const images = (item.show as Record<string, unknown>).images as Record<string, Record<string, string>> | undefined;
          const posterUrl = images?.poster?.full || images?.poster?.medium || null;
          allItems.push({
            type: "show",
            title: item.show.title || "Unknown",
            year: item.show.year,
            rating: item.show.rating,
            slug: item.show.ids?.slug || "",
            posterUrl,
          });
        }
      }
    }

    if (allItems.length === 0) {
      await ctx.reply("❌ لم يتم العثور على نتائج.", {
        reply_markup: backToMenu(),
      });
      return;
    }

    const first = allItems[0];
    const caption = `🔍 نتائج البحث: "${query}"\n\n${allItems.map((item) => {
      const icon = item.type === "movie" ? "🎬" : "📺";
      const stars = item.rating ? "⭐".repeat(Math.round(item.rating / 2)) : "";
      return `${icon} **${item.title}** (${item.year || "?"})\n⭐ ${item.rating || "N/A"} ${stars}`;
    }).join("\n\n")}`;

    const keyboard = buildKeyboard(allItems);

    if (first.posterUrl) {
      await ctx.api.sendPhoto(ctx.chat!.id, first.posterUrl, {
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
    console.error("Search error:", error);
    await ctx.reply("❌ حدث خطأ أثناء البحث. حاول مرة أخرى.");
  }
}

function buildKeyboard(
  items: SearchResultItem[],
): Array<Array<{ text: string; callback_data: string }>> {
  const keyboard: Array<Array<{ text: string; callback_data: string }>> = [];
  for (const item of items) {
    const icon = item.type === "movie" ? "🎬" : "📺";
    keyboard.push([
      { text: `${icon} ${item.title}`, callback_data: `detail:${item.slug}` },
    ]);
  }
  keyboard.push([{ text: "🔙 القائمة الرئيسية", callback_data: "back_to_menu" }]);
  return keyboard;
}
