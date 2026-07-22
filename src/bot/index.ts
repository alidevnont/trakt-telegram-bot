import { Bot } from "grammy";
import { authMiddleware } from "./middleware.ts";
import { startCommand, unlinkCommand } from "./commands/start.ts";
import { searchCommand } from "./commands/search.ts";
import { recommendationsCommand } from "./commands/recommendations.ts";
import { watchlistCommand, watchlistAdd, watchlistRemove } from "./commands/watchlist.ts";
import { historyCommand, addToHistory } from "./commands/history.ts";
import { ratingsCommand, rateItem } from "./commands/ratings.ts";
import { calendarCommand } from "./commands/calendar.ts";
import { statsCommand } from "./commands/stats.ts";
import { helpCommand } from "./commands/help.ts";
import { trakt } from "../trakt/client.ts";
import { getMovieImages, getShowImages, getPosterUrl } from "../trakt/images.ts";
import { mainMenu, backToMenu } from "./keyboards.ts";

export function createBot(token: string) {
  const bot = new Bot(token);

  // Middleware
  bot.use(authMiddleware);

  // Commands
  bot.command("start", startCommand);
  bot.command("unlink", unlinkCommand);
  bot.command("search", searchCommand);
  bot.command("recommendations", recommendationsCommand);
  bot.command("watchlist", (ctx) => watchlistCommand(ctx));
  bot.command("history", (ctx) => historyCommand(ctx));
  bot.command("ratings", ratingsCommand);
  bot.command("calendar", calendarCommand);
  bot.command("stats", statsCommand);
  bot.command("help", helpCommand);

  // Callback queries - Menu navigation
  bot.callbackQuery("back_to_menu", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText("اختر من القائمة:", { reply_markup: mainMenu });
  });

  bot.callbackQuery("noop", async (ctx) => {
    await ctx.answerCallbackQuery();
  });

  // Callback queries - Commands
  bot.callbackQuery("cmd_search", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      "🔍 **البحث**\n\nاستخدم الأمر مع كلمة البحث:\n`/search batman`",
      { parse_mode: "Markdown" },
    );
  });

  bot.callbackQuery("cmd_recommendations", async (ctx) => {
    await ctx.answerCallbackQuery();
    await recommendationsCommand(ctx);
  });

  bot.callbackQuery("cmd_watchlist", async (ctx) => {
    await ctx.answerCallbackQuery();
    await watchlistCommand(ctx);
  });

  bot.callbackQuery("cmd_history", async (ctx) => {
    await ctx.answerCallbackQuery();
    await historyCommand(ctx);
  });

  bot.callbackQuery("cmd_ratings", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ratingsCommand(ctx);
  });

  bot.callbackQuery("cmd_calendar", async (ctx) => {
    await ctx.answerCallbackQuery();
    await calendarCommand(ctx);
  });

  bot.callbackQuery("cmd_stats", async (ctx) => {
    await ctx.answerCallbackQuery();
    await statsCommand(ctx);
  });

  bot.callbackQuery("cmd_help", async (ctx) => {
    await ctx.answerCallbackQuery();
    await helpCommand(ctx);
  });

  // Callback queries - Detail view
  bot.callbackQuery(/detail:(.+)/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const slug = ctx.match![1];

    try {
      // Try to get as movie first, then show
      let res = await trakt.movies.summary({
        params: { id: slug, extended: "full" },
      });

      if (res.status === 200) {
        const movie = res.body;
        const images = await getMovieImages(slug, ctx.traktToken?.accessToken);
        const posterUrl = getPosterUrl(images);
        const message = [
          `🎬 **${movie.title}** (${movie.year || "?"})`,
          "",
          movie.overview || "لا يوجد وصف",
          "",
          `⭐ ${movie.rating || "N/A"} (${movie.votes?.toLocaleString() || "0"} votes)`,
          `⏱️ ${movie.runtime || "?"} دقيقة`,
          `📅 ${movie.released || "?"}`,
          `🏷️ ${movie.genres?.join(", ") || "?"}`,
          `🔒 ${movie.certification || "N/A"}`,
        ].join("\n");

        const keyboard = [
          [
            { text: "📋 أضف للقائمة", callback_data: `wl_add:${slug}` },
            { text: "⭐ قيّم", callback_data: `rate:${slug}` },
          ],
          [
            { text: "📺 أضف للسجل", callback_data: `hist_add:${slug}` },
          ],
          [
            { text: "🔗 على Trakt", url: `https://trakt.tv/movies/${slug}` },
          ],
          [{ text: "🔙 رجوع", callback_data: "back_to_menu" }],
        ];

        if (posterUrl) {
          // Delete the old text message and send a new photo
          try {
            await ctx.api.deleteMessage(ctx.chat!.id, ctx.callbackQuery.message!.message_id);
          } catch {}
          await ctx.api.sendPhoto(ctx.chat!.id, posterUrl, {
            caption: message,
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: keyboard },
          });
        } else {
          await ctx.editMessageText(message, {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: keyboard },
          });
        }
        return;
      }

      // Try as show
      res = await trakt.shows.summary({
        params: { id: slug, extended: "full" },
      });

      if (res.status === 200) {
        const show = res.body;
        const images = await getShowImages(slug, ctx.traktToken?.accessToken);
        const posterUrl = getPosterUrl(images);
        const message = [
          `📺 **${show.title}** (${show.year || "?"})`,
          "",
          show.overview || "لا يوجد وصف",
          "",
          `⭐ ${show.rating || "N/A"} (${show.votes?.toLocaleString() || "0"} votes)`,
          `⏱️ ${show.runtime || "?"} دقيقة`,
          `📅 ${show.first_aired || "?"}`,
          `🏷️ ${show.genres?.join(", ") || "?"}`,
          `📡 ${show.network || "?"}`,
          `📊 ${show.status || "?"}`,
        ].join("\n");

        const keyboard = [
          [
            { text: "📋 أضف للقائمة", callback_data: `wl_add:${slug}` },
            { text: "⭐ قيّم", callback_data: `rate:${slug}` },
          ],
          [
            { text: "🔗 على Trakt", url: `https://trakt.tv/shows/${slug}` },
          ],
          [{ text: "🔙 رجوع", callback_data: "back_to_menu" }],
        ];

        if (posterUrl) {
          try {
            await ctx.api.deleteMessage(ctx.chat!.id, ctx.callbackQuery.message!.message_id);
          } catch {}
          await ctx.api.sendPhoto(ctx.chat!.id, posterUrl, {
            caption: message,
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: keyboard },
          });
        } else {
          await ctx.editMessageText(message, {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: keyboard },
          });
        }
        return;
      }

      await ctx.editMessageText("❌ لم يتم العثور على التفاصيل.", {
        reply_markup: backToMenu(),
      });
    } catch (error) {
      console.error("Detail error:", error);
      await ctx.editMessageText("❌ حدث خطأ أثناء تحميل التفاصيل.", {
        reply_markup: backToMenu(),
      });
    }
  });

  // Callback queries - Watchlist
  bot.callbackQuery(/wl_add:(.+)/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const slug = ctx.match![1];
    await watchlistAdd(ctx, slug);
  });

  bot.callbackQuery(/wl_remove:(.+)/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const slug = ctx.match![1];
    await watchlistRemove(ctx, slug);
  });

  // Callback queries - History
  bot.callbackQuery(/hist_add:(.+)/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const slug = ctx.match![1];
    await addToHistory(ctx, slug);
  });

  // Callback queries - Ratings
  bot.callbackQuery(/rate:(.+):(\d+)/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const slug = ctx.match![1];
    const rating = parseInt(ctx.match![2]);
    await rateItem(ctx, slug, rating);
  });

  bot.callbackQuery(/rate:(.+)/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const slug = ctx.match![1];
    await rateItem(ctx, slug);
  });

  // Error handling
  bot.catch((err) => {
    console.error("Bot error:", err.message);
  });

  return bot;
}
