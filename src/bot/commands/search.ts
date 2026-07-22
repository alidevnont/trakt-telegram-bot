import { Context } from "grammy";
import { trakt } from "../../trakt/client.ts";
import { getMovieImages, getShowImages, getPosterUrl } from "../../trakt/images.ts";
import { backToMenu } from "../keyboards.ts";

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
        query: { query, limit: 5 },
      }),
      trakt.search.query({
        params: { type: "show" },
        query: { query, limit: 5 },
      }),
    ]);

    const allItems: Array<{
      type: "movie" | "show";
      title: string;
      year: number | null;
      rating: number | null;
      slug: string;
      images: Awaited<ReturnType<typeof getMovieImages>>;
    }> = [];

    if (moviesRes.status === 200 && moviesRes.body.length > 0) {
      for (const item of moviesRes.body) {
        if (item.movie) {
          const images = await getMovieImages(item.movie.ids?.slug || "", ctx.traktToken?.accessToken);
          allItems.push({
            type: "movie",
            title: item.movie.title || "Unknown",
            year: item.movie.year,
            rating: item.movie.rating,
            slug: item.movie.ids?.slug || "",
            images,
          });
        }
      }
    }

    if (showsRes.status === 200 && showsRes.body.length > 0) {
      for (const item of showsRes.body) {
        if (item.show) {
          const images = await getShowImages(item.show.ids?.slug || "", ctx.traktToken?.accessToken);
          allItems.push({
            type: "show",
            title: item.show.title || "Unknown",
            year: item.show.year,
            rating: item.show.rating,
            slug: item.show.ids?.slug || "",
            images,
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

    const message = `🔍 نتائج البحث: "${query}"`;

    if (allItems.length > 0) {
      const first = allItems[0];
      const posterUrl = getPosterUrl(first.images);
      const caption = formatItem(first);
      const keyboard = buildKeyboard(allItems);

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
    }
  } catch (error) {
    console.error("Search error:", error);
    await ctx.reply("❌ حدث خطأ أثناء البحث. حاول مرة أخرى.");
  }
}

function formatItem(item: {
  type: "movie" | "show";
  title: string;
  year: number | null;
  rating: number | null;
  slug: string;
}): string {
  const icon = item.type === "movie" ? "🎬" : "📺";
  const stars = item.rating ? "⭐".repeat(Math.round(item.rating / 2)) : "";
  return [
    `${icon} **${item.title}** (${item.year || "?"})`,
    `⭐ ${item.rating || "N/A"} ${stars}`,
  ].join("\n");
}

function buildKeyboard(
  items: Array<{ type: string; title: string; slug: string }>,
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
