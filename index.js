require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const QUESTIONS = [
  "Как тебя зовут?",
  "Сколько тебе лет?",
  "Из какого ты города?",
  "Укажи рост и параметры (грудь/талия/бедра):",
  "Есть ли у тебя опыт съёмок? Если да — сколько?",
  "Готова ли ты к откровенным образам? (да/нет)",
  "Оставь свой контакт, номер телефона или тг (@name):",
  "Загрузи 3 своих фото, отправляй по одной фото 📸"
];

const userStates = new Map();

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (msg.text === "/start") {
    userStates.set(chatId, { step: 0, answers: [], photos: [] });
    return bot.sendMessage(chatId, "Привет! Я бот W-Model Management. Давай начнем анкету!\n\n" + QUESTIONS[0]);
  }

  const state = userStates.get(chatId);
  if (!state) return;

  if (msg.photo) {
    const photoId = msg.photo[msg.photo.length - 1].file_id;
    state.photos.push(photoId);

    if (state.photos.length >= 3) {
      return finishApplication(chatId);
    }

      if (state.photos.length === 1 ) {
        return bot.sendMessage(chatId, "Отправь второе фото");
      } else {return bot.sendMessage(chatId, "Отправь третье фото");}
  }

  if (state.step < QUESTIONS.length - 1) {
    state.answers.push(msg.text);
    state.step++;
    bot.sendMessage(chatId, QUESTIONS[state.step]);
  } else {
    state.answers.push(msg.text);
    bot.sendMessage(chatId, "Теперь пришли еще своих фото 📸");
  }
});

async function finishApplication(chatId) {
  const state = userStates.get(chatId);
  if (!state) return;

  const text = state.answers.map((ans, i) => `${ans}`).join("\n");

  await bot.sendMessage(chatId, "Спасибо! Вот твоя анкета:\n\n" + text + "\n\nОжидай, с тобой свяжется агент.");

  // Отправить админу
  await bot.sendMessage(process.env.ADMIN_CHAT_ID, `Новая анкета:\n\n${text}`, { parse_mode: "Markdown" });

  for (const photoId of state.photos) {
    await bot.sendPhoto(process.env.ADMIN_CHAT_ID, photoId);
  }

  userStates.delete(chatId);
}
