import { InlineKeyboard } from "grammy";

export const mainMenu = new InlineKeyboard()
  .text("🔍 بحث", "cmd_search")
  .text("🎯 التوصيات", "cmd_recommendations")
  .row()
  .text("📋 قائمة المشاهدة", "cmd_watchlist")
  .text("📺 سجل المشاهدة", "cmd_history")
  .row()
  .text("⭐ التقييمات", "cmd_ratings")
  .text("📅 التقويم", "cmd_calendar")
  .row()
  .text("📊 الإحصائيات", "cmd_stats")
  .text("❓ المساعدة", "cmd_help");

export function movieKeyboard(movieId: string, title: string) {
  return new InlineKeyboard()
    .text("📋 أضف للقائمة", `wl_add:${movieId}`)
    .text("⭐ قيّم", `rate:${movieId}`)
    .row()
    .text("ℹ️ تفاصيل", `detail:${movieId}`)
    .url("🔗 على Trakt", `https://trakt.tv/movies/${movieId}`);
}

export function showKeyboard(showId: string, title: string) {
  return new InlineKeyboard()
    .text("📋 أضف للقائمة", `wl_add:${showId}`)
    .text("⭐ قيّم", `rate:${showId}`)
    .row()
    .text("ℹ️ تفاصيل", `detail:${showId}`)
    .url("🔗 على Trakt", `https://trakt.tv/shows/${showId}`);
}

export function confirmKeyboard(action: string, id: string) {
  return new InlineKeyboard()
    .text("✅ تأكيد", `${action}:confirm:${id}`)
    .text("❌ إلغاء", "cancel");
}

export function paginationKeyboard(
  prefix: string,
  page: number,
  totalPages: number,
) {
  const kb = new InlineKeyboard();

  if (page > 1) {
    kb.text("◀️ السابق", `${prefix}:${page - 1}`);
  }

  kb.text(`${page}/${totalPages}`, "noop");

  if (page < totalPages) {
    kb.text("التالي ▶️", `${prefix}:${page + 1}`);
  }

  return kb;
}

export function ratingKeyboard(itemId: string) {
  const kb = new InlineKeyboard();

  for (let i = 1; i <= 5; i++) {
    kb.text("⭐".repeat(i), `rate:${itemId}:${i}`);
    if (i === 5) kb.row();
  }

  for (let i = 6; i <= 10; i++) {
    kb.text("⭐".repeat(i), `rate:${itemId}:${i}`);
    if (i === 10) kb.row();
  }

  return kb;
}

export function backToMenu() {
  return new InlineKeyboard().text("🔙 القائمة الرئيسية", "back_to_menu");
}
