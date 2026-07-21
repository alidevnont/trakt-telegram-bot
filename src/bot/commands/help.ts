import { Context } from "grammy";

export async function helpCommand(ctx: Context) {
  const message = [
    "❓ **المساعدة - بوت Trakt**\n",
    "بوت للتحكم بحسابك على Trakt.tv\n",
    "**🔗 ربط الحساب:**\n",
    "• `/start` - ربط حساب Trakt (Device Code)",
    "• `/unlink` - فصل الحساب\n",
    "**🔍 البحث والمحتوى:**\n",
    "• `/search <كلمة>` - بحث عن أفلام/مسلسلات",
    "• `/recommendations` - توصياتك الشخصية",
    "• `/calendar` - التقويم (العروض القادمة)\n",
    "**📋 إدارة المحتوى:**\n",
    "• `/watchlist` - قائمة المشاهدة",
    "• `/history` - سجل المشاهدة",
    "• `/ratings` - التقييمات\n",
    "**📊 معلومات:**\n",
    "• `/stats` - إحصائيات المشاهدة",
    "• `/help` - هذه المساعدة\n",
    "**💡 نصائح:**\n",
    "• اضغط على الأزرار للتفاعل مع المحتوى",
    "• يمكنك ربط حسابك للحصول على ميزات إضافية",
    "• البوت يدعم الأفلام والمسلسلات\n",
    "**🔗 روابط مفيدة:**\n",
    "• [Trakt TV](https://trakt.tv)",
    "• [API Documentation](https://docs.trakt.tv)",
  ].join("\n");

  await ctx.reply(message, { parse_mode: "Markdown" });
}
