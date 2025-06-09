require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const QUESTIONS = [
  "Как тебя зовут?",
  "Сколько тебе лет?",
  "Из какого ты города?",
  "Укажи рост и параметры (грудь/талия/бедра), например: 170 90/60/90",
  "Есть ли у тебя опыт съёмок? (да/нет, если да — сколько)",
  "Готова ли ты к откровенным образам? (да/нет/возхможно)",
  "Оставь свой контакт (номер телефона или Telegram: @username)",
  "Загрузи 3 своих фото (отправляй по одной фото 📸)"
];

const userStates = new Map();

// 💡 Проверка вводимых данных с объяснением ошибки
function validateInput(step, text, chatId) {
  switch (step) {
    case 0:
      if (/^[а-яА-ЯёЁa-zA-Z\s]{2,}$/.test(text)) return true;
      bot.sendMessage(chatId, "⚠️ Имя должно содержать хотя бы 2 буквы.");
      return false;

    case 1:
  const age = parseInt(text);
  if (isNaN(age)) {
    bot.sendMessage(chatId, "⚠️ Введите число.");
    return false;
  }
  if (age < 18) {
    bot.sendMessage(chatId, "⚠️ Ждем тебя, когда исполнится 18 😔");
    return false;
  }
  return true;

    case 2:
      if (text.trim().length > 0) return true;
      bot.sendMessage(chatId, "⚠️ Введи корректный город.");
      return false;

    case 3:
      if (/^\d{3}\s\d{2,3}\/\d{2,3}\/\d{2,3}$/.test(text)) return true;
      bot.sendMessage(chatId, "⚠️ Формат: 170 90/60/90");
      return false;

    case 4:
  const lower = text.toLowerCase().trim();
  if (lower.includes("да") || lower.includes("нет")) return true;
  const digits = lower.match(/\d+/);
  if (digits && parseInt(digits[0]) >= 0) return true;
  bot.sendMessage(chatId, "⚠️ Укажи 'да', 'нет' или число.");
  return false;


    case 5:
      if (/^(да|нет|возможно)$/i.test(text)) return true;
      bot.sendMessage(chatId, "⚠️ Ответь 'да', 'нет' или 'возможно'.");
      return false;

    case 6:
      if (/^(\+?\d{7,15}|@[\w\d_]{5,})$/.test(text.trim())) return true;
      bot.sendMessage(chatId, "⚠️ Укажи номер телефона или Telegram: @username.");
      return false;

    default:
      return true;
  }
}

// 📥 Обработка всех сообщений
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  // 👉 /start
  if (msg.text === "/start") {
    userStates.set(chatId, { step: 0, answers: [], photos: [] });
    return bot.sendMessage(chatId, "Привет! Я бот W-Model Management. Давай начнём анкету 📝\n\n" + QUESTIONS[0]);
  }

  const state = userStates.get(chatId);
  if (!state) return;

  // 📸 Фото
  if (msg.photo) {
    const photoId = msg.photo[msg.photo.length - 1].file_id;
    state.photos.push(photoId);

    if (state.photos.length < 3) {
      const count = state.photos.length + 1;
      return bot.sendMessage(chatId, `Отправь ${count}-е фото`);
    } else {
      return finishApplication(chatId);
    }
  }

  const currentStep = state.step;

  if (!validateInput(currentStep, msg.text, chatId)) {
    return; // ❌ Ошибка — не двигаемся вперёд, повторится тот же вопрос
  }

  // ✅ Ответ принят
  state.answers.push(msg.text);
  state.step++;

  if (state.step < QUESTIONS.length - 1) {
    bot.sendMessage(chatId, QUESTIONS[state.step]);
  } else {
    bot.sendMessage(chatId, "Теперь пришли ещё 3 своих фото 📸");
  }
});

// ✅ Завершение анкеты
async function finishApplication(chatId) {
  const state = userStates.get(chatId);
  if (!state) return;

  const summary = QUESTIONS.slice(0, 7)
    .map((q, i) => `*${q}*\n${state.answers[i]}`)
    .join("\n\n");

  await bot.sendMessage(chatId, "Спасибо! Вот твоя анкета:\n\n" + summary + "\n\nОжидай — с тобой свяжется агент.\n\nЕсли где-то непрвильно заполнила анкету, то нажми сюдая: /start", {
    parse_mode: "Markdown"
  });

  // ⬆️ Отправка админу
  await bot.sendMessage(process.env.ADMIN_CHAT_ID, "📥 Новая анкета:\n\n" + summary, { parse_mode: "Markdown" });

  for (const photoId of state.photos) {
    await bot.sendPhoto(process.env.ADMIN_CHAT_ID, photoId);
  }

  userStates.delete(chatId);
}
