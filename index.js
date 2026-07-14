const { Telegraf, Markup } = require('telegraf');
const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN || '8874819131:AAEUl7ftV_btjFZND3IWsJMb0eez99nbvPc');
const ADMIN_ID = 8089667910;

let adminUploadState = {};

function backButton(text = '🔙 بازگشت به منو') {
  return Markup.inlineKeyboard([[Markup.button.callback(text, 'back_to_main')]]);
}

const db = new sqlite3.Database('bot.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (...)`); // همان قبلی
  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY,
    title TEXT,
    content TEXT,
    file_id TEXT,
    file_type TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

bot.use(async (ctx, next) => { /* middleware قبلی */ });

// Start Menu
bot.start((ctx) => { /* منوی اصلی */ });

// Admin Panel
bot.command('admin', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.reply('⛔ دسترسی غیرمجاز');

  ctx.reply('🛠 پنل مدیریت ادمین', Markup.inlineKeyboard([
    [Markup.button.callback('📊 آمار', 'stats')],
    [Markup.button.callback('👥 کاربران', 'users')],
    [Markup.button.callback('📢 پیام همگانی', 'broadcast')],
    [Markup.button.callback('🗑 مدیریت اعلان‌ها', 'manage_notifications')],
  ]));
});

// مدیریت اعلان‌ها + حذف
bot.action('manage_notifications', (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  db.all('SELECT * FROM notifications ORDER BY sent_at DESC', (err, rows) => {
    if (rows.length === 0) return ctx.editMessageText('هیچ اعلانی وجود ندارد.', backButton());

    let text = '🗑 لیست اعلان‌ها:\n\n';
    const buttons = rows.map(row => [Markup.button.callback(`🗑 حذف ${row.id} - ${row.title}`, `delete_${row.id}`)]);

    buttons.push([Markup.button.callback('🔙 بازگشت', 'admin_back')]);

    ctx.editMessageText(text, Markup.inlineKeyboard(buttons));
  });
});

bot.action(/delete_(\d+)/, (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  const id = ctx.match[1];
  db.run('DELETE FROM notifications WHERE id = ?', [id], () => {
    ctx.answerCbQuery('✅ حذف شد');
    ctx.editMessageText('اعلان حذف شد. برای لیست جدید /admin بزنید.');
  });
});

bot.action('admin_back', (ctx) => {
  ctx.answerCbQuery();
  ctx.editMessageText('🛠 پنل مدیریت ادمین', /* دکمه‌های پنل */);
});

// منوی جزوه‌ها با دانلود
bot.action('latest_notes', (ctx) => {
  ctx.answerCbQuery();
  const notesMenu = Markup.inlineKeyboard([
    [Markup.button.callback('📖 عربی', 'notes_arabic')],
    // ... همه درس‌ها
    [Markup.button.callback('🔙 بازگشت', 'back_to_main')]
  ]);
  ctx.editMessageText('📚 انتخاب درس:', notesMenu);
});

bot.action(/notes_(.+)/, (ctx) => {
  const lesson = ctx.match[1];

  db.all("SELECT * FROM notifications WHERE title LIKE ?", [`%${lesson}%`], (err, rows) => {
    if (rows.length === 0) {
      return ctx.editMessageText(`📚 هنوز جزوه‌ای برای ${lesson} آپلود نشده.`, backButton('🔙 بازگشت به درس‌ها'));
    }

    rows.forEach(row => {
      const caption = `${row.title}\n\n${row.content}`;
      if (row.file_type === 'document') {
        ctx.replyWithDocument(row.file_id, { caption });
      } else {
        ctx.replyWithPhoto(row.file_id, { caption });
      }
    });
  });
});

bot.launch().then(() => console.log('ربات آنلاین ✅'));
