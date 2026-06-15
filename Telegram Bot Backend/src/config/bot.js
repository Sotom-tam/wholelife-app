// src/config/bot.js

import { Telegraf, Markup, Scenes,session } from "telegraf";
import { sessionStore } from "../db.js";
import { reflectIdentity } from "./reflectIdentity.js";
import { registerGlobalCommands } from "./botCommand.js";
import { saveOnboarding,updateReminderTime } from "../models/user.js";
const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

// Register commands with Telegram so they show in the menu
await bot.telegram.setMyCommands([
    { command: "start",    description: "Start or restart BecomingYou" },
    { command: "restart",  description: "Start over from the beginning" },
    { command: "help",     description: "See what I can do" },
    { command: "support",  description: "Get help or send feedback" },
    { command: "checkin",  description: "Log today's practice" },
    { command: "reflect",  description: "Weekly reflection" },
    { command: "progress", description: "See your 14-day progress" },
]);

// ─── Random greeting pool ───────────────────────────────────────────────────
const greetings = [
    `Hey, you made it. 👋 I'm BecomingYou — a small bot with one big job: helping you actually become the person you keep meaning to be.`,
    `Well hello there. 👋 I'm BecomingYou. I don't do motivation speeches or streak counters. I just help you show up, one small step at a time.`,
    `Hey! Glad you're here. 👋 I'm BecomingYou — think of me as a quiet accountability partner who never judges a missed day.`,
    `Oh hey, a new face. 👋 I'm BecomingYou. My whole thing is helping you build the habits that actually stick — starting embarrassingly small.`,
];

const randomGreeting = () => greetings[Math.floor(Math.random() * greetings.length)];

// ─── Domain options ─────────────────────────────────────────────────────────
const domainKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback("💪 Health & body", "domain_health")],
    [Markup.button.callback("🧠 Mind & focus", "domain_mind")],
    [Markup.button.callback("❤️ Relationships", "domain_relationships")],
    [Markup.button.callback("😴 Rest & energy", "domain_rest")],
    [Markup.button.callback("🙏 Spiritual / inner life", "domain_spiritual")],
    [Markup.button.callback("✍️ Something else", "domain_other")],
]);

// ─── MVA Introductions by domain ──────────────────────────────────────────────
const mvaIntros = {
    domain_health: [
        `Here's what the research actually says: the people who get healthier aren't the ones who go hardest — they're the ones who show up most.\n\nThree tiny starting points based on what you shared:`,
        `You don't need a new gym routine. You need one small thing you'll actually do.\n\nPick the one that feels most doable — not most impressive:`,
        `The gap between who you are and who you're becoming? It's crossed one small action at a time.\n\nHere are three to choose from:`,
    ],
    domain_mind: [
        `Mental clarity isn't built in big breakthroughs — it's built in quiet, consistent moments.\n\nThree small ones to choose from:`,
        `You don't need to overhaul your whole routine. You need one thing that starts to shift the pattern.\n\nPick the one that feels most real right now:`,
        `Here's the thing about focus — you can't force it, but you can create the conditions for it.\n\nThree small ways to start:`,
    ],
    domain_relationships: [
        `Connection isn't built in grand gestures. It's built in small, consistent moments of showing up.\n\nThree tiny ways to start:`,
        `The people who matter to you don't need more of your time — they need more of your presence.\n\nPick the one that feels most doable:`,
        `Relationships change slowly, then suddenly. It starts with one small thing done consistently.\n\nThree options:`,
    ],
    domain_rest: [
        `Rest isn't a reward for finishing everything. It's what makes everything else possible.\n\nThree small ways to start reclaiming it:`,
        `You can't think your way into better sleep or more energy — you have to build toward it.\n\nOne small action at a time:`,
        `The goal isn't a perfect sleep routine. It's one small shift that your body actually notices.\n\nThree to choose from:`,
    ],
    domain_spiritual: [
        `You don't find stillness by waiting for a quiet moment. You create it — even in a noisy life.\n\nThree small ways to start:`,
        `Inner work doesn't need hours. It needs consistency. Even five minutes of intention changes something.\n\nThree options:`,
        `The practice isn't the big retreat or the perfect morning. It's the small thing you actually do.\n\nPick one:`,
    ],
    domain_other: [
        `Big changes start embarrassingly small. That's not a consolation — that's how it actually works.\n\nThree tiny starting points:`,
        `The version of you who has this handled? They started exactly where you are now.\n\nPick the one that feels most doable:`,
        `You don't need to figure it all out. You just need one small action you can do today.\n\nThree options:`,
    ],
};

const getRandomMvaIntro = (domain) => {
    const options = mvaIntros[domain] || mvaIntros["domain_other"];
    return options[Math.floor(Math.random() * options.length)];
};

// ─── MVA suggestions by domain ──────────────────────────────────────────────
const mvaSuggestions = {
    domain_health: [
        // Movement focused
        "Do 10 minutes of movement after waking up — walk, stretch, anything counts",
        "Put your workout clothes out the night before so they're waiting for you",
        "Take a 15-minute walk after one meal every day",
        // Nutrition focused  
        "Drink a full glass of water before every meal",
        "Add one vegetable or fruit to one meal each day — just one",
        // General body care
        "Sleep and wake at the same time every day — even weekends",
        "Take 5 deep breaths before eating anything — slows you down, changes choices",
    ],
    domain_mind: [
        "Write 3 sentences about how you're feeling before you open any app in the morning",
        "Put your phone face-down for the first 30 minutes after waking",
        "Read one page of a real book before bed — just one",
        "At the end of each day, write one thing that went well",
        "Take a 10-minute walk with no headphones — just think",
    ],
    domain_relationships: [
        "Send one voice note to someone you care about each day — not a text, a voice note",
        "Put your phone away during one full meal every day",
        "Ask one person 'how are you really doing?' this week and actually listen",
        "Tell someone you appreciate them today — specifically, not generally",
        "Schedule one real conversation with someone you've been meaning to catch up with",
    ],
    domain_rest: [
        "Set a consistent bedtime alarm — same time every night including weekends",
        "No screens for 20 minutes before bed — replace with anything analog",
        "Do 5 minutes of slow breathing before you sleep",
        "Write a short brain dump before bed — everything on your mind, out of your head",
        "Keep your phone charger outside your bedroom",
    ],
    domain_spiritual: [
        "Sit in silence for 5 minutes each morning before the day starts",
        "Write one thing you're grateful for each night — specific, not generic",
        "Spend 10 minutes in prayer, meditation, or reflection daily",
        "Read something that feeds your spirit for 10 minutes a day",
        "Take one mindful walk a week — no destination, no podcast, just present",
    ],
    domain_other: [
        "Spend 10 focused minutes a day on the thing that matters to you",
        "Write one intention for the day each morning before anything else",
        "Do one small thing today you'll thank yourself for tomorrow",
        "Block 15 minutes in your day for the thing you keep putting off",
        "At the end of each day, ask yourself: did I move toward who I want to be?",
    ],
};

const getRandomMvaSuggestions = (domain) => {
    const all = mvaSuggestions[domain] || mvaSuggestions["domain_other"];
    // Shuffle and take first 3
    return [...all]
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
};

//Reflection Suggestion ────────────────────────────────────────────────────────
const fallbackReflections = {
    domain_health: [
        `It sounds like this isn't really about how you look — it's about how you feel in your own body every day. That's a much more powerful reason to start.`,
        `What I'm hearing is that you want to feel like yourself again. Not a new you — just the version of you that actually has energy and feels good.`,
        `It sounds like you're ready to stop putting your body last. Like you've realised that taking care of yourself isn't selfish — it's necessary.`,
    ],
    domain_mind: [
        `It sounds like you're tired of feeling scattered — like your attention belongs to everything except what actually matters to you.`,
        `What I'm hearing is that you want your mind to feel like yours again. Quieter, clearer, more focused on what you choose.`,
        `It sounds like you want to show up to your own life more fully — not just going through the motions, but actually present.`,
    ],
    domain_relationships: [
        `It sounds like the people you love most are feeling the distance, and so are you. You want to actually be there — not just nearby.`,
        `What I'm hearing is that connection matters deeply to you, and right now it doesn't feel like enough. You want to change that.`,
        `It sounds like you're ready to be more intentional about the people in your life — to stop letting time pass and start showing up.`,
    ],
    domain_rest: [
        `It sounds like you're running on empty and you've been pretending that's okay for too long. Rest isn't laziness — and part of you knows that.`,
        `What I'm hearing is that you want to wake up feeling like you actually slept. Like your body and mind got a real chance to recover.`,
        `It sounds like everything suffers when you're exhausted — and you're ready to actually do something about it instead of just pushing through.`,
    ],
    domain_spiritual: [
        `It sounds like you're craving something quieter and deeper — a sense of groundedness that the noise of everyday life keeps drowning out.`,
        `What I'm hearing is that you want to feel more connected — to yourself, to something bigger, to a sense of purpose that actually holds.`,
        `It sounds like you want your inner life to get the same attention you give everything else. To finally make space for what actually centres you.`,
    ],
    domain_other: [
        `It sounds like you've been carrying this for a while — and you're ready to stop waiting for the right moment and just start.`,
        `What I'm hearing is that this matters to you more than you usually admit. And that's exactly why it's worth showing up for.`,
        `It sounds like you know what you need to do — you just need something to help you actually do it, consistently, without burning out.`,
    ],
};

const getRandomFallback = (domain) => {
    const options = fallbackReflections[domain] || fallbackReflections["domain_other"];
    return options[Math.floor(Math.random() * options.length)];
};

// ─── Onboarding Scene ────────────────────────────────────────────────────────
export const onboardingScene = new Scenes.WizardScene(
    "onboarding",

    // STEP 0 — Random greeting + disclaimer + name check
    async function step0(ctx) {
        await ctx.reply(randomGreeting());

        await ctx.reply(
            `Quick honest note before we begin:\n\nI'm a habit tool, not a doctor. ` +
            `I can help you build better daily practices — but if something's going on health-wise, ` +
            `please talk to a medical professional first. I work best alongside proper care, not instead of it. 🙏`
        );

        await ctx.reply(
            `Okay — can I call you ${ctx.from.first_name}?`,
            Markup.inlineKeyboard([
                Markup.button.callback("Yes, that's me", "name_yes"),
                Markup.button.callback("I go by something else", "name_no"),
            ])
        );

        return ctx.wizard.next();
    },

    // STEP 1 — Confirm name, pick life domain
    async function step1(ctx) {
        if (ctx.message?.text) {
            ctx.wizard.state.name = ctx.message.text;
            await ctx.reply(
                `Love that. Nice to meet you, ${ctx.wizard.state.name}.\n\n` +
                `So — what part of your life do you most want to work on right now?`,
                domainKeyboard
            );
            return ctx.wizard.next();
        }

        if (!ctx.callbackQuery) {
            await ctx.reply(`Just tap Yes or No above — I'll wait 😊`);
            return;
        }

        await ctx.answerCbQuery();

        if (ctx.callbackQuery.data === "name_yes") {
            ctx.wizard.state.name = ctx.from.first_name;
            await ctx.reply(
                `Nice to meet you, ${ctx.wizard.state.name}.\n\n` +
                `So — what part of your life do you most want to work on right now?`,
                domainKeyboard
            );
            return ctx.wizard.next();
        } else {
            await ctx.reply(`No worries — what should I call you?`);
        }
    },

    // STEP 2 — Receive domain, health disclaimer if needed, ask surface goal
    async function step2(ctx) {
        if (!ctx.callbackQuery) {
            await ctx.reply(`Just pick one of the options above — no wrong answers here 😊`);
            return;
        }

        await ctx.answerCbQuery();
        ctx.wizard.state.domain = ctx.callbackQuery.data;

        // Health disclaimer nudge
        if (ctx.callbackQuery.data === "domain_health") {
            await ctx.reply(
                `Love that you're focusing on your health 💪\n\n` +
                `Small reminder: if you're dealing with any medical condition or symptoms, ` +
                `keep working with your doctor. I'm here to help with the daily consistency side — ` +
                `not to replace proper medical care.`
            );
        }

        await ctx.reply(
            `Got it. Now tell me — what do you actually want to change or achieve in that area?\n\n` +
            `Don't overthink it. Say it how you'd say it to a friend.`
        );

        return ctx.wizard.next();
    },

    // STEP 3 — Receive surface goal, ask the why
    async function step3(ctx) {
        if (!ctx.message?.text) return;

        ctx.wizard.state.surfaceGoal = ctx.message.text;

        await ctx.reply(
            `Okay, I hear you.\n\nNow here's the important question — ` +
            `and take a second with it:\n\n` +
            `*Why does that actually matter to you?* ` +
            `What would genuinely be different in your life if that changed?`,
            { parse_mode: "Markdown" }
        );

        return ctx.wizard.next();
    },

    // STEP 4 — Receive the why, reflect identity back
    async function step4(ctx) {
        if (!ctx.message?.text) return;

        ctx.wizard.state.why = ctx.message.text;
        //while we wait for AI Model API send typing
        await ctx.sendChatAction("typing")        

        // Bot reflects identity back based on what they typed
        // In V1 this is a warm generic reflection — later this is where an LLM call would go
        let reflection
        //AI api call
        try {
        reflection = await reflectIdentity({
            name: ctx.wizard.state.name,
            domain: ctx.wizard.state.domain,
            surfaceGoal: ctx.wizard.state.surfaceGoal,
            why: ctx.wizard.state.why,
        });
        } catch (err) {
            // Fallback if API fails — never break the flow
            console.error("AI reflection failed:", err);
            reflection=getRandomFallback(ctx.wizard.state.domain);
        }
        await ctx.reply(reflection)
        await ctx.reply(
            `Does that feel close to what you meant?`,
            Markup.inlineKeyboard([
                Markup.button.callback("Yes, exactly", "identity_yes"),
                Markup.button.callback("Not quite", "identity_no"),
            ])
        );

        return ctx.wizard.next();
    },

    // STEP 5 — Confirm identity, suggest MVAs
    async function step5(ctx) {
        if (!ctx.callbackQuery) {
            await ctx.reply(`Just tap one of the options above 😊`);
            return;
        }

        await ctx.answerCbQuery();

        if (ctx.callbackQuery.data === "identity_no") {
            await ctx.reply(
                `That's fair — I don't want to put words in your mouth.\n\n` +
                `In your own words, how would you finish this sentence:\n\n` +
                `*"I want to become someone who..."*`,
                { parse_mode: "Markdown" }
            );
            // In V1 we'll accept their text and move on
            // TODO: add a step here to receive free text identity statement
        }

        const domain = ctx.wizard.state.domain || "domain_other";
        const suggestions = getRandomMvaSuggestions(domain);
        ctx.wizard.state.currentSuggestions = suggestions;

        await ctx.reply(getRandomMvaIntro(domain),{ parse_mode: "Markdown" }
        );

        await ctx.reply(
            `Which one fits?`,
            Markup.inlineKeyboard([
                [Markup.button.callback(`1. ${suggestions[0]}`, "mva_0")],
                [Markup.button.callback(`2. ${suggestions[1]}`, "mva_1")],
                [Markup.button.callback(`3. ${suggestions[2]}`, "mva_2")],
                [Markup.button.callback("I have my own in mind", "mva_custom")],
            ])
        );

        return ctx.wizard.next();
    },

    // STEP 6 — Receive MVA choice, show summary
    async function step6(ctx) {
        if (!ctx.callbackQuery && !ctx.message?.text) return;

        const domain = ctx.wizard.state.domain || "domain_other";
        const suggestions = ctx.wizard.state.currentSuggestions;
        let mva;

        if (ctx.message?.text) {
            // They typed their own MVA
            mva = ctx.message.text;
        } else {
            await ctx.answerCbQuery();

            if (ctx.callbackQuery.data === "mva_custom") {
                await ctx.reply(`I love that. What's your action?`);
                return; // Wait for their next message
            }

            const index = parseInt(ctx.callbackQuery.data.split("_")[1]);
            mva = suggestions[index];
        }

        ctx.wizard.state.mva = mva;
        await ctx.reply(
            `Last thing — what time should I check in with you each day?\n\n` +
            `Pick one below, or I'll default to 7pm.`,
            Markup.inlineKeyboard([
                [Markup.button.callback("7:00 AM", "reminder_07:00")],
                [Markup.button.callback("12:00 PM", "reminder_12:00")],
                [Markup.button.callback("6:00 PM", "reminder_18:00")],
                [Markup.button.callback("7:00 PM (default)", "reminder_19:00")],
                [Markup.button.callback("9:00 PM", "reminder_21:00")],
            ])
        );
        return ctx.wizard.next();
    },
    // STEP 7 — Receive reminder time, save everything, show summary
    async function step7(ctx) {
        if (!ctx.callbackQuery) {
            await ctx.reply(`Just tap one of the time options above 😊`);
            return;
        }

        await ctx.answerCbQuery();

        // Extract the time value from the callback e.g. "reminder_19:00" → "19:00"
        const reminderTime = ctx.callbackQuery.data.split("_")[1];
        ctx.wizard.state.reminderTime = reminderTime;

        const name = ctx.wizard.state.name;
        const mva = ctx.wizard.state.mva;

        await saveOnboarding({
            telegramId: ctx.from.id,
            name,
            domain: ctx.wizard.state.domain,
            surfaceGoal: ctx.wizard.state.surfaceGoal,
            identityStatement: ctx.wizard.state.identityStatement,
            mva,
            reminderTime, // new field
        });

        ctx.session = {};

        await ctx.reply(
            `This is your starting point, ${name}:\n\n` +
            `🌱 *Who you're becoming:* Someone who shows up for themselves\n` +
            `⚡ *Your daily practice:* ${mva}\n` +
            `🔔 *Daily check-in:* ${ctx.callbackQuery.data === "reminder_19:00" ? "7:00 PM" : reminderTime}\n\n` +
            `That's it. No perfection required. Just one small action, every day.\n\n` +
            `I'll check in with you at that time. You've already started. 🙌`,
            { parse_mode: "Markdown" }
        );

        return ctx.scene.leave();
    }
);

export const reminderChangeScene = new Scenes.WizardScene("reminder_change",
    async function step0(ctx) {
        await ctx.reply(
            `What time would you like your reminder?`,
            Markup.inlineKeyboard([
                [Markup.button.callback("7:00 AM", "reminder_07:00")],
                [Markup.button.callback("12:00 PM", "reminder_12:00")],
                [Markup.button.callback("6:00 PM", "reminder_18:00")],
                [Markup.button.callback("7:00 PM (default)", "reminder_19:00")],
                [Markup.button.callback("9:00 PM", "reminder_21:00")],
            ])
        )
        return ctx.wizard.next();
    },
    async function step1(ctx) {
        if (!ctx.callbackQuery) {
            await ctx.reply(`Just tap one of the time options above 😊`);
            return;
        }
        await ctx.answerCbQuery();
        const reminderTime = ctx.callbackQuery.data.split("_")[1];
        const userId = ctx.from.id
        await updateReminderTime(userId, reminderTime)
        await ctx.reply(`Got it! I'll check in with you at ${reminderTime} from now on. If you ever want to change it again, just tap /reminders.`)
        return ctx.scene.leave();
    }
);
const stage = new Scenes.Stage([onboardingScene, reminderChangeScene]);
bot.use(stage.middleware());


//function in config/botCommands.js that registers all the bot built in commands
registerGlobalCommands(bot)

export default bot;