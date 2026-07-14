const { Telegraf, Markup } = require('telegraf');
const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN || '8874819131:AAEUl7ftV_btjFZND3IWsJMb0eez99nbvPc');
const ADMIN_ID = 8089667910;

let adminUploadState = {};

const db = new sqlite3.Database('bot.db');

db.serialize(() => {
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
    db.run(`INSERT OR REPLACE INTO users (id, username, first_name, last_name, last_active) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`, 
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
  ctx.reply('سلام! خوش آمدید 🎓\nلطفا انتخاب کنید:', mainMenu);
});

bot.command('admin', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.reply('⛔ دسترسی غیرمجاز');
  ctx.reply('🛠 پنل ادمین', Markup.inlineKeyboard([
    [Markup.button.callback('🗑 مدیریت اعلان‌ها', 'manage_notifications')],
    [Markup.button.callback('📢 پیام همگانی', 'broadcast')],
  ]));
});

bot.action('manage_notifications', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  db.all('SELECT * FROM notifications ORDER BY sent_at DESC', (err, rows) => {
    if (!rows.length) return ctx.editMessageText('هیچ اعلانی نیست.', backButton());
    const buttons = rows.map(r => [Markup.button.callback(`🗑 حذف ${r.id}`, `delete_${r.id}`)]);
    buttons.push([Markup.button.callback('🔙 بازگشت', 'admin_back')]);
    ctx.editMessageText('لیست اعلان‌ها:', Markup.inlineKeyboard(buttons));
  });
});

bot.action(/delete_(\d+)/, (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  db.run('DELETE FROM notifications WHERE id = ?', [ctx.match[1]], () => ctx.answerCbQuery('حذف شد'));
});

bot.action('latest_notes', (ctx) => {
  ctx.editMessageText('📚 انتخاب درس:', Markup.inlineKeyboard([
    [Markup.button.callback('📖 فارسی', 'notes_persian')],
    [Markup.button.callback('📖 ریاضی', 'notes_math')],
    [Markup.button.callback('📖 عربی', 'notes_arabic')],
    [Markup.button.callback('🔙 بازگشت به منو', 'back_to_main')]
  ]));
});

bot.action(/notes_(.+)/, (ctx) => {
  const lesson = ctx.match[1];
  db.all("SELECT * FROM notifications WHERE title LIKE ?", [`%${lesson}%`], (err, rows) => {
    if (!rows.length) return ctx.editMessageText(`جزوه ${lesson} هنوز آپلود نشده.`);
    rows.forEach(row => {
      const caption = row.content || row.title;
      if (row.file_type === 'document') ctx.replyWithDocument(row.file_id, { caption });
      else ctx.replyWithPhoto(row.file_id, { caption });
    });
  });
});

bot.action('support', (ctx) => ctx.editMessageText('پشتیبانی: @FOUKYOUMAN'));
bot.action('back_to_main', (ctx) => ctx.editMessageText('منو اصلی', /* main menu */));

bot.launch().then(() => console.log('ربات آنلاین'));const { Telegraf, Markup } = require('telegraf');
const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN || '8874819131:AAEUl7ftV_btjFZND3IWsJMb0eez99nbvPc');
const ADMIN_ID = 8089667910;

let adminUploadState = {};

const db = new sqlite3.Database('bot.db');

db.serialize(() => {
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
    db.run(`INSERT OR REPLACE INTO users (id, username, first_name, last_name, last_active) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`, 
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
  ctx.reply('سلام! خوش آمدید 🎓\nلطفا انتخاب کنید:', mainMenu);
});

bot.command('admin', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.reply('⛔ دسترسی غیرمجاز');
  ctx.reply('🛠 پنل ادمین', Markup.inlineKeyboard([
    [Markup.button.callback('🗑 مدیریت اعلان‌ها', 'manage_notifications')],
    [Markup.button.callback('📢 پیام همگانی', 'broadcast')],
  ]));
});

bot.action('manage_notifications', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  db.all('SELECT * FROM notifications ORDER BY sent_at DESC', (err, rows) => {
    if (!rows.length) return ctx.editMessageText('هیچ اعلانی نیست.', backButton());
    const buttons = rows.map(r => [Markup.button.callback(`🗑 حذف ${r.id}`, `delete_${r.id}`)]);
    buttons.push([Markup.button.callback('🔙 بازگشت', 'admin_back')]);
    ctx.editMessageText('لیست اعلان‌ها:', Markup.inlineKeyboard(buttons));
  });
});

bot.action(/delete_(\d+)/, (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;
  db.run('DELETE FROM notifications WHERE id = ?', [ctx.match[1]], () => ctx.answerCbQuery('حذف شد'));
});

bot.action('latest_notes', (ctx) => {
  ctx.editMessageText('📚 انتخاب درس:', Markup.inlineKeyboard([
    [Markup.button.callback('📖 فارسی', 'notes_persian')],
    [Markup.button.callback('📖 ریاضی', 'notes_math')],
    [Markup.button.callback('📖 عربی', 'notes_arabic')],
    [Markup.button.callback('🔙 بازگشت به منو', 'back_to_main')]
  ]));
});

bot.action(/notes_(.+)/, (ctx) => {
  const lesson = ctx.match[1];
  db.all("SELECT * FROM notifications WHERE title LIKE ?", [`%${lesson}%`], (err, rows) => {
    if (!rows.length) return ctx.editMessageText(`جزوه ${lesson} هنوز آپلود نشده.`);
    rows.forEach(row => {
      const caption = row.content || row.title;
      if (row.file_type === 'document') ctx.replyWithDocument(row.file_id, { caption });
      else ctx.replyWithPhoto(row.file_id, { caption });
    });
  });
});

bot.action('support', (ctx) => ctx.editMessageText('پشتیبانی: @FOUKYOUMAN'));
bot.action('back_to_main', (ctx) => ctx.editMessageText('منو اصلی', /* main menu */));

bot.launch().then(() => console.log('ربات آنلاین'));
