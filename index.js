const { Telegraf, Markup } = require('telegraf');
const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');

dotenv.config();

const bot = new Telegraf('8874819131:AAEUl7ftV_btjFZND3IWsJMb0eez99nbvPc');
const ADMIN_ID = 8089667910;

let adminUploadState = {};

function backButton(text = '🔙 بازگشت به منو اصلی') {
  return Markup.inlineKeyboard([[Markup.button.callback(text, 'back_to_main')]]);
}

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

bot.start((ctx) => {
  const mainMenu = Markup.inlineKeyboard([
    [Markup.button.callback('📢 دریافت اخبار', 'get_news')],
    [Markup.button.callback('📚 جدیدترین جزوه‌ها', 'latest_notes')],
    [Markup.button.callback('❓ پشتیبانی', 'support')],
    [Markup.button.callback('ℹ️ درباره ربات', 'about')],
  ]);

  ctx.reply('سلام! خوش آمدید به ربات اطلاع‌رسانی برنامه‌های درسی 🎓\n\nلطفا از منوی زیر انتخاب کنید:', mainMenu);
});

bot.command('news', (ctx) => {
  db.all('SELECT * FROM notifications ORDER BY sent_at DESC LIMIT 5', (err, rows) => {
    if (rows.length === 0) return ctx.reply('فعلا خبری ثبت نشده');
    rows.forEach(notif => {
      const msg = `📢 ${notif.title}\n\n${notif.content}`;
      if (notif.file_id) {
        notif.file_type === 'document' ? ctx.replyWithDocument(notif.file_id, { caption: msg }) : ctx.replyWithPhoto(notif.file_id, { caption: msg });
      } else {
        ctx.reply(msg);
      }
    });
  });
});

bot.action('get_news', (ctx) => {
  ctx.answerCbQuery();
  db.all('SELECT * FROM notifications ORDER BY sent_at DESC LIMIT 5', (err, rows) => {
    if (rows.length === 0) return ctx.editMessageText('هنوز خبری ثبت نشده');
    ctx.editMessageText('📢 جدیدترین اخبار:');
    rows.forEach(notif => {
      const msg = `📢 ${notif.title}\n\n${notif.content}`;
      if (notif.file_id) {
        notif.file_type === 'document' ? ctx.replyWithDocument(notif.file_id, { caption: msg }) : ctx.replyWithPhoto(notif.file_id, { caption: msg });
      } else {
        ctx.reply(msg);
      }
    });
  });
});

bot.action('latest_notes', (ctx) => {
  ctx.answerCbQuery();
  const notesMenu = Markup.inlineKeyboard([
    [Markup.button.callback('📖 عربی', 'notes_arabic')],
    [Markup.button.callback('📖 فارسی', 'notes_persian')],
    [Markup.button.callback('📖 دینی', 'notes_religion')],
    [Markup.button.callback('📖 زبان', 'notes_language')],
    [Markup.button.callback('📖 ریاضی', 'notes_math')],
    [Markup.button.callback('📖 تاریخ', 'notes_history')],
    [Markup.button.callback('📖 جامعه شناسی', 'notes_sociology')],
    [Markup.button.callback('📖 جغرافیا', 'notes_geography')],
    [Markup.button.callback('📖 روانشناسی', 'notes_psychology')],
    [Markup.button.callback('📖 فنون', 'notes_techniques')],
    [Markup.button.callback('📖 فلسفه', 'notes_philosophy')],
    [Markup.button.callback('🔥 جزوه کیری خفنه حسام', 'notes_hosam')],
    [Markup.button.callback('🔙 بازگشت به منو', 'back_to_main')]
  ]);
  ctx.editMessageText('📚 لطفا درس مورد نظر را انتخاب کنید:', notesMenu);
});

bot.action(/notes_(.+)/, (ctx) => {
  const lesson = ctx.match[1];
  if (ctx.from.id === ADMIN_ID) {
    adminUploadState[ctx.from.id] = lesson;
    ctx.editMessageText(`📤 آپلود فایل برای درس **${lesson}**\n\nفایل (عکس یا PDF) همراه با کپشن بفرستید.`);
  } else {
    ctx.editMessageText(`📚 جزوه **${lesson}** هنوز آپلود نشده.\n\nبه زودی اضافه می‌شود.`, 
      Markup.inlineKeyboard([
        [Markup.button.callback('🔙 بازگشت به درس‌ها', 'latest_notes')],
        [Markup.button.callback('🔙 منو اصلی', 'back_to_main')]
      ]));
  }
});

bot.on(['document', 'photo'], async (ctx) => {
  if (ctx.from.id !== ADMIN_ID || !adminUploadState[ctx.from.id]) return;

  const lesson = adminUploadState[ctx.from.id];
  let fileId, fileType = 'document';

  if (ctx.message.document) {
    fileId = ctx.message.document.file_id;
  } else if (ctx.message.photo) {
    fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    fileType = 'photo';
  }

  const caption = ctx.message.caption || `جزوه ${lesson}`;

  db.run(`INSERT INTO notifications (title, content, file_id, file_type) VALUES (?, ?, ?, ?)`,
    [`جزوه ${lesson}`, caption, fileId, fileType], (err) => {
      if (err) ctx.reply('خطا');
      else ctx.reply(`✅ فایل برای درس **${lesson}** ذخیره شد!`);
      delete adminUploadState[ctx.from.id];
    });
});

bot.action('support', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText('❓ پشتیبانی:\n\n@FOUKYOUMAN', backButton());
});

bot.action('about', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText('ℹ️ درباره ربات:\n\nاین ربات برای اطلاع‌رسانی اخبار و جزوه‌های درسی طراحی شده است.', backButton());
});

// پنل ادمین کامل
bot.command('admin', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.reply('⛔ دسترسی غیرمجاز');

  ctx.reply('🛠 پنل مدیریت ادمین', Markup.inlineKeyboard([
    [Markup.button.callback('🗑 مدیریت اعلان‌ها', 'manage_notifications')],
    [Markup.button.callback('📢 پیام همگانی', 'broadcast')],
  ]));
});

bot.action('manage_notifications', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  db.all('SELECT * FROM notifications ORDER BY sent_at DESC', (err, rows) => {
    if (!rows.length) return ctx.editMessageText('هیچ اعلانی وجود ندارد.', backButton());
    const buttons = rows.map(r => [Markup.button.callback(`🗑 حذف ${r.id}`, `delete_${r.id}`)]);
    buttons.push([Markup.button.callback('🔙 بازگشت', 'back_to_main')]);
    ctx.editMessageText('لیست اعلان‌ها:', Markup.inlineKeyboard(buttons));
  });
});

bot.action(/delete_(\d+)/, (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  db.run('DELETE FROM notifications WHERE id = ?', [ctx.match[1]], () => {
    ctx.answerCbQuery('✅ حذف شد');
    ctx.editMessageText('اعلان حذف شد.');
  });
});

bot.launch()
  .then(() => console.log('🤖 ربات راه‌اندازی شد!'))
  .catch(err => console.error('خطا:', err));

console.log('ربات در حال اجراست...');
