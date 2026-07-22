import { Context } from "grammy";
import { trakt } from "../../trakt/client.ts";
import { getMovieImages, getShowImages, getPosterUrl } from "../../trakt/images.ts";
import { backToMenu } from "../keyboards.ts";

interface Item {
  type: "movie" | "show";
  title: string;
  year: number | null;
  rating: number | null;
  slug: string;
  posterUrl: string | null;
}

export async function recommendationsCommand(ctx: Context) {
  if (!ctx.traktToken) {
    await ctx.reply("🔒 هذا الأمر يتطلب ربط حساب Trakt.\n\nاستخدم /start للربط.");
    return;
  }

  try {
    const [moviesRes, showsRes] = await Promise.all([
      trakt.recommendations.movies.recommend({
        query: { extended: "full,images" },
        headers: { Authorization: `Bearer ${ctx.traktToken.accessToken}` },
      }),
      trakt.recommendations.shows.recommend({
        query: { extended: "full,images" },
        headers: { Authorization: `Bearer ${ctx.traktToken.accessToken}` },
      }),
    ]);

    const items: Item[] = [];

    if (moviesRes.status === 200) {
      for (const m of moviesRes.body.slice(0, 5)) {
        const body = m as unknown as Record<string, unknown>;
        items.push({
          type: "movie",
          title: m.title || "Unknown",
          year: m.year,
          rating: m.rating,
          slug: m.ids?.slug || "",
          posterUrl: extractPoster(body),
        });
      }
    }

    if (showsRes.status === 200) {
      for (const s of showsRes.body.slice(0, 5)) {
        const body = s as unknown as Record<string, unknown>;
        items.push({
          type: "show",
          title: s.title || "Unknown",
          year: s.year,
          rating: s.rating,
          slug: s.ids?.slug || "",
          posterUrl: extractPoster(body),
        });
      }
    }

    if (items.length === 0) {
      await ctx.reply("❌ لا توجد توصيات حالياً.", { reply_markup: backToMenu() });
      return;
    }

    const caption = `🎯 **توصياتك الشخصية**\n\n${items.map((item) => {
      const icon = item.type === "movie" ? "🎬" : "📺";
      const stars = item.rating ? "⭐".repeat(Math.round(item.rating / 2)) : "";
      return `${icon} **${item.title}** (${item.year || "?"})\n⭐ ${item.rating || "N/A"} ${stars}`;
    }).join("\n\n")}`;

    const kb = items.map((item) => {
      const icon = item.type === "movie" ? "🎬" : "📺";
      return [{ text: `${icon} ${item.title}`, callback_data: `detail:${item.slug}` }];
    });
    kb.push([{ text: "🔙 القائمة الرئيسية", callback_data: "back_to_menu" }]);

    const posterUrl = items[0]?.posterUrl;
    if (posterUrl) {
      await ctx.api.sendPhoto(ctx.chat!.id, posterUrl, {
        caption, parse_mode: "Markdown",
        reply_markup: { inline_keyboard: kb },
      });
    } else {
      await ctx.reply(caption, { parse_mode: "Markdown", reply_markup: { inline_keyboard: kb } });
    }
  } catch (error) {
    console.error("Recommendations error:", error);
    await ctx.reply("❌ حدث خطأ أثناء تحميل التوصيات.");
  }
}

function extractPoster(body: Record<string, unknown>): string | null {
  const images = body?.images as Record<string, Record<string, string>> | undefined;
  return images?.poster?.full || images?.poster?.medium || null;
}
