// src/config/notifications.js
import { Markup } from "telegraf";

const checkinMessages = [
    (name, mva) => `Hey ${name} 👋 Time to show up for yourself. Did you get to: *${mva}* today?`,
    (name, mva) => `${name} — small question: did you cast a vote for who you're becoming today?\n\n_Your practice: ${mva}_`,
    (name, mva) => `Check-in time, ${name}. Did you make space for *${mva}* today?`,
    (name, mva) => `Hey ${name}. One question: did today's version of you show up for *${mva}*?`,
    (name, mva) => `${name} — your future self is paying attention 👀\n\nDid you do *${mva}* today?`,
    (name, mva) => `Quick check-in, ${name}. Did you prove something to yourself today?\n\n_Practice: ${mva}_`,
    (name, mva) => `Hey ${name} — every day is a vote. Did you vote for your future self with *${mva}* today?`,
    (name, mva) => `${name}, how did today go? Did you get to *${mva}*?`,
    (name, mva) => `Time to check in, ${name}. Did you make *${mva}* happen today?`,
    (name, mva) => `${name} — small but real: did you do *${mva}* today? That's all that matters right now.`,
    (name, mva) => `Hey ${name} 🌱 Did you show up for the person you're becoming? Your practice was *${mva}*.`,
    (name, mva) => `Check-in, ${name}. Did today's small action happen? *${mva}*`,
    (name, mva) => `${name} — the system works when you work it. Did *${mva}* happen today?`,
    (name, mva) => `Hey ${name}. Did you hand the baton to tomorrow's you in a better place?\n\n_Practice: ${mva}_`,
    (name, mva) => `${name}, one honest question: did you do *${mva}* today?`,
    (name, mva) => `Check-in time 🔔 ${name}, did you make space for *${mva}* today?`,
    (name, mva) => `${name} — small wins build the person. Did *${mva}* happen today?`,
    (name, mva) => `Hey ${name}. Your practice today was *${mva}*. Did it happen?`,
    (name, mva) => `${name}, did you show up for yourself today? Even a little counts.\n\n_Practice: ${mva}_`,
    (name, mva) => `Check-in, ${name}. Did you do *${mva}* — the small thing that adds up?`,
];

const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
function getRandomCheckinMessage(name, mva) {
    const messageFn = getRandom(checkinMessages);
    return messageFn(name, mva);
}
export async function sendCheckinMessage(bot, telegramId, name, mva, mvaId, today) {
    const text = getRandomCheckinMessage(name, mva);

    // Ensure `today` is a YYYY-MM-DD string. Some pg configs may return
    // strings already, others may return Date objects — normalize either way.
    let todayStr = today;
    if (today instanceof Date) {
        todayStr = today.toISOString().slice(0, 10);
    }

    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback("✅ Yes", `checkin_yes_${mvaId}_${todayStr}`),
            Markup.button.callback("❌ Not today", `checkin_no_${mvaId}_${todayStr}`),
        ],
    ]);

    await bot.telegram.sendMessage(telegramId, text, {
        parse_mode: "Markdown",
        ...keyboard,
    });
}