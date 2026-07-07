const { Telegraf, Markup } = require('telegraf');
const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');

dotenv.config();

const bot = new Telegraf('8874819131:AAEUl7ftV_btjFZND3IWsJMb0eez99nbvPc');
const ADMIN_ID = 8089667910;

// تابع دکمه بازگشت
function backButton() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔙 بازگشت به منو اصلی', 'back_to_main')]
  ]);
}

// دیتابیس
const db = new sqlite3.Database('bot.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY,
    title TEXT,
    content TEXT,
    file_id TEXT,
    file_type TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

bot.use(async (ctx, next) => {
  if (ctx.from) {
    db.run(`INSERT OR REPLACE INTO users (id, username, first_name, last_name, last_active) 
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`, 
      [ctx.from.id, ctx.from.username, ctx.from.first_name, ctx.from.last_name]);
  }
  return next();
});

bot.start((ctx) => ctx.reply('✅ سلام! ربات اطلاع‌رسانی برنامه‌های درسی فعال شد.\n/news برای دریافت اخبار'));

bot.command('news', (ctx) => {
  db.all('SELECT * FROM notifications ORDER BY sent_at DESC LIMIT 5', (err, rows) => {
    if (rows.length === 0) return ctx.reply('فعلا از سوی ادمین خبری ثبت نشده');
    rows.forEach(notif => {
      const msg = `📢 ${notif.title}\n\n${notif.content}`;
      if (notif.file_id) {
        notif.file_type === 'document' 
          ? ctx.replyWithDocument(notif.file_id, { caption: msg })
          : ctx.replyWithPhoto(notif.file_id, { caption: msg });
      } else {
        ctx.reply(msg);
      }
    });
  });
});

bot.command('admin', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.reply('⛔ دسترسی غیرمجاز');
  
  ctx.reply('🛠 پنل مدیریت ادمین:', Markup.inlineKeyboard([
    [Markup.button.callback('📊 آمار', 'stats')],
    [Markup.button.callback('👥 کاربران', 'users')],
    [Markup.button.callback('📢 پیام همگانی', 'broadcast')],
    [Markup.button.callback('🗑 مدیریت اعلان‌ها', 'manage_notifications')]
  ]));
});

// آمار
bot.action('stats', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  db.get('SELECT COUNT(*) as count FROM users', (_, u) => {
    db.get('SELECT COUNT(*) as count FROM notifications', (_, n) => {
      ctx.editMessageText(`📊 آمار:\n\n👤 کاربران: ${u.count}\n📢 اعلان‌ها: ${n.count}`, 
        backButton()
      );
    });
  });
});

// کاربران
bot.action('users', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  db.all('SELECT * FROM users ORDER BY registered_at DESC LIMIT 30', (_, users) => {
    let text = '👥 آخرین کاربران:\n\n';
    users.forEach(u => text += `${u.id} - ${u.first_name} ${u.username ? '@'+u.username : ''}\n`);
    ctx.editMessageText(text, backButton());
  });
});

// پیام همگانی
bot.action('broadcast', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  ctx.editMessageText('✍️ متن پیام همگانی را ارسال کنید:');
  bot.once('text', (msgCtx) => {
    if (msgCtx.from.id !== ADMIN_ID) return;
    db.all('SELECT id FROM users', (_, users) => {
      users.forEach(user => {
        bot.telegram.sendMessage(user.id, msgCtx.message.text).catch(() => {});
      });
      msgCtx.reply('✅ پیام همگانی ارسال شد!');
    });
  });
});

// آپلود فایل
bot.on(['document', 'photo'], (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  let fileId, type;
  if (ctx.message.document) {
    fileId = ctx.message.document.file_id;
    type = 'document';
  } else {
    fileId = ctx.message.photo[ctx.message.photo.length-1].file_id;
    type = 'photo';
  }

  const content = ctx.message.caption || 'بدون توضیحات';
  
  db.run(`INSERT INTO notifications (title, content, file_id, file_type) VALUES (?, ?, ?, ?)`,
    ['اعلان جدید', content, fileId, type], () => {
      ctx.reply('✅ فایل با موفقیت ثبت شد.');
    });
});

// مدیریت اعلان‌ها
bot.action('manage_notifications', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  db.all('SELECT * FROM notifications ORDER BY sent_at DESC', (err, notifications) => {
    if (notifications.length === 0) {
      return ctx.editMessageText('هیچ اعلانی وجود ندارد.', backButton());
    }

    let message = '🗑 لیست اعلان‌ها:\n\n';
    const buttons = [];

    notifications.forEach(notif => {
      message += `${notif.id}. ${notif.title}\n`;
      buttons.push([Markup.button.callback(`🗑 حذف ${notif.id}`, `delete_${notif.id}`)]);
    });

    buttons.push([Markup.button.callback('🔙 بازگشت', 'back_to_main')]);

    ctx.editMessageText(message, Markup.inlineKeyboard(buttons));
  });
});

// حذف اعلان
bot.action(/delete_(\d+)/, (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  const notifId = ctx.match[1];

  db.run('DELETE FROM notifications WHERE id = ?', [notifId], (err) => {
    if (err) {
      return ctx.answerCbQuery('خطا در حذف!');
    }
    ctx.answerCbQuery('✅ اعلان حذف شد');
    ctx.editMessageText('✅ اعلان با موفقیت حذف شد.\nبرای دیدن لیست جدید دوباره /admin بزنید.');
  });
});

// بازگشت به منو اصلی
bot.action('back_to_main', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  ctx.editMessageText('🛠 پنل مدیریت ادمین:', Markup.inlineKeyboard([
    [Markup.button.callback('📊 آمار', 'stats')],
    [Markup.button.callback('👥 کاربران', 'users')],
    [Markup.button.callback('📢 پیام همگانی', 'broadcast')],
    [Markup.button.callback('🗑 مدیریت اعلان‌ها', 'manage_notifications')]
  ]));
});

// Easter Egg: Siuu !
bot.hears(/siuu/i, async (ctx) => {
  const messages = [
    "گریه کن رونال7دو فن پرتغال امشب حذف میشه",
  "سوووو و کیر خر",
    "گریه کن مسی همیشه بهترینه",
    "Siuuuuuuuuuuuuu! 🏆"
  ];

  // انتخاب تصادفی پیام
  const randomMsg = messages[Math.floor(Math.random() * messages.length)];

  await ctx.reply(randomMsg);

  // ارسال عکس رونالدو (c:\Users\Ehsan\Desktop\goodbot\photo_2026-07-06_20-17-50.jpg)
  try {
    await ctx.replyWithPhoto('https://i.imgur.com/0z0z0z0.jpg', {
      caption: 'SIUUUUUUU! 🐐'
    });
  } catch (e) {
    // اگر عکس لود نشد مشکلی پیش نمیاد
  }
});

bot.launch()
  .then(() => console.log('🤖 ربات با موفقیت راه‌اندازی شد!'))
  .catch(err => console.error('خطا:', err));

console.log('ربات در حال اجراست...');