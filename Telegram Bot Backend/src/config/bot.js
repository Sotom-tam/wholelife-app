import { Telegraf, Markup, Scenes, session } from "telegraf";
import { reflectIdentity } from "../ai/reflectIdentity.js";

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

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

// ─── MVA suggestions by domain ──────────────────────────────────────────────
const mvaSuggestions = {
    domain_health: [
        "Drink a glass of water first thing every morning",
        "Put on your trainers after breakfast — even if you don't go further",
        "Do 5 minutes of movement before lunch",
    ],
    domain_mind: [
        "Write 3 sentences in a journal before bed",
        "Put your phone face-down for the first 30 minutes of your day",
        "Read one page of a book before you sleep",
    ],
    domain_relationships: [
        "Send one voice note or text to someone you care about each day",
        "Ask someone 'how are you really doing?' this week",
        "Put away your phone during one meal a day",
    ],
    domain_rest: [
        "Set a consistent bedtime alarm — even on weekends",
        "Do 5 minutes of slow breathing before sleep",
        "No screens 20 minutes before bed",
    ],
    domain_spiritual: [
        "Sit in silence for 5 minutes each morning",
        "Write one thing you're grateful for before you sleep",
        "Spend 10 minutes in prayer, meditation, or reflection daily",
    ],
    domain_other: [
        "Spend 10 minutes a day on the thing that matters to you",
        "Write down one intention for the day each morning",
        "Do one small thing today you'll thank yourself for tomorrow",
    ],
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
            reflection =
                `It sounds like you're not just chasing a result — ` +
                `you're becoming someone who genuinely shows up for themselves. ` +
                `That shift in identity is where real change starts.`;
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
        const suggestions = mvaSuggestions[domain];

        await ctx.reply(
            `Here's something I've learned: big changes start embarrassingly small.\n\n` +
            `Based on what you've shared, here are three tiny daily actions that could actually move the needle:\n\n` +
            `Pick the one that feels most *doable* right now — not most impressive, most doable.`,
            { parse_mode: "Markdown" }
        );

        await ctx.reply(
            `Which one?`,
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
        const suggestions = mvaSuggestions[domain];
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
        const name = ctx.wizard.state.name;

        // Save to DB here (ctx.wizard.state has everything)
        // await saveUser({ name, goal: ctx.wizard.state.surfaceGoal, why: ctx.wizard.state.why, mva, domain })

        await ctx.reply(
            `This is your starting point, ${name}:\n\n` +
            `🌱 *Who you're becoming:* Someone who shows up for themselves\n` +
            `⚡ *Your daily practice:* ${mva}\n\n` +
            `That's it. No perfection required. Just one small action, every day.\n\n` +
            `I'll check in with you tomorrow. You've already started. 🙌`,
            { parse_mode: "Markdown" }
        );

        return ctx.scene.leave();
    }
);

const stage = new Scenes.Stage([onboardingScene]);
bot.use(stage.middleware());

bot.start(async (ctx) => {
    ctx.scene.enter("onboarding");
});

export default bot;