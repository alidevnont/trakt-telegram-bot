# 🤖 Trakt Telegram Bot

بوت تليجرام للتحكم بحسابك على Trakt.tv

## المميزات

- 🔍 **بحث** - ابحث عن أفلام ومسلسلات
- 🎯 **توصيات** - توصياتك الشخصية
- 📋 **قائمة المشاهدة** - إدارة القائمة
- 📺 **سجل المشاهدة** - عرض وإضافة للمشاهدات
- ⭐ **التقييمات** - تقييم الأفلام والمسلسلات
- 📅 **التقويم** - العروض القادمة
- 📊 **الإحصائيات** - إحصائيات المشاهدة

## المتطلبات

1. [Deno](https://docs.deno.com/runtime/getting_started/installation/)
2. حساب [Trakt API](https://trakt.tv/oauth/applications)
3. بوت تليجرام من [@BotFather](https://t.me/BotFather)

## التثبيت

```bash
# 1. استنساخ المشروع
cd trakt-telegram-bot

# 2. إعداد المتغيرات
cp .env.example .env
# عدّل ملف .env ببياناتك:
# TELEGRAM_BOT_TOKEN=your_bot_token
# TRAKT_CLIENT_ID=your_client_id
# TRAKT_CLIENT_SECRET=your_client_secret

# 3. تثبيت المكتبات
deno task install

# 4. تشغيل البوت
deno task dev
```

## الحصول على المفاتيح

### Telegram Bot Token
1. افتح [@BotFather](https://t.me/BotFather)
2. أرسل `/newbot`
3. اتبع التعليمات
4. انسخ الـ Token

### Trakt API Credentials
1. اذهب إلى [trakt.tv/oauth/applications](https://trakt.tv/oauth/applications)
2. سجّل الدخول
3. أنشئ تطبيق جديد:
   - **Name**: Bot Trakt
   - **Redirect URI**: `urn:ietf:wg:oauth:2.0:oob`
4. انسخ `Client ID` و `Client Secret`

## أوامر البوت

| الأمر | الوظيفة |
|-------|---------|
| `/start` | ربط حساب Trakt |
| `/search <query>` | بحث عن فيلم/مسلسل |
| `/recommendations` | التوصيات الشخصية |
| `/watchlist` | قائمة المشاهدة |
| `/history` | سجل المشاهدة |
| `/ratings` | التقييمات |
| `/calendar` | التقويم |
| `/stats` | الإحصائيات |
| `/unlink` | فصل الحساب |
| `/help` | المساعدة |

## هيكل المشروع

```
trakt-telegram-bot/
├── main.ts                 # نقطة البداية
├── deno.json              # إعدادات Deno
├── .env                   # المتغيرات البيئية
├── src/
│   ├── bot/
│   │   ├── index.ts       # إعداد البوت
│   │   ├── middleware.ts   # middleware المصادقة
│   │   ├── keyboards.ts   # أزرار Inline
│   │   └── commands/      # جميع الأوامر
│   ├── trakt/
│   │   ├── client.ts      # عميل Trakt API
│   │   └── auth.ts        # OAuth authentication
│   └── storage/
│       └── tokens.ts      # حفظ التوكنات
└── data/                  # ملفات البيانات
```

## النشر

### على Deno Deploy
1. ارفع المشروع على GitHub
2. سجّل في [deno.com/deploy](https://deno.com/deploy)
3. أنشئ مشروع جديد
4. أضف المتغيرات البيئية
5. اربطه بالمستودع

### على سيرفر
```bash
# تشغيل في الخلفية
nohup deno task start > bot.log 2>&1 &
```

## الترخيص

MIT License
