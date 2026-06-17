import { Markup } from "telegraf";

import { getUserByTelegramId, getUserWithLatestPractice, updateReminderStatus, updateReminderTime, getResumeStepFromDb } from "../models/user.js";
// src/config/commands.js
export function registerGlobalCommands(bot, domainKeyboard) {

    async function startOrResumeOnboarding(ctx) {
        if (ctx.scene?.current) {
            await ctx.scene.leave();
        }
        if (ctx.wizard) {
            ctx.wizard.state = {};
        }

        // Layer A priority check: if a live session is already in-progress on the onboarding scene,
        // let Telegraf's normal flow handle it (don't override with Layer B).
        // WizardContextWizard stores step cursor at ctx.session.__scenes.cursor (internal state).
        // If cursor > 0, the user is mid-scene and has live session state.
        const hasLiveSession =
            ctx.session?.__scenes?.current === "onboarding" &&
            (ctx.session.__scenes.cursor ?? 0) > 0;
        
        if (hasLiveSession) {
            // Live session exists; let the normal scene resumption flow continue.
            // Return early so we don't enter again or trigger Layer B fallback.
            return;
        }

        const user = await getUserByTelegramId(ctx.from.id);

        // Highest priority: if user completed onboarding, show welcome-back menu (Layer A)
        if (user && user.onboarding_complete) {
            // Fetch latest practice details for display in the menu
            const latest = await getUserWithLatestPractice(ctx.from.id);
            await ctx.reply(
                `Hey ${user.name || "there"}, good to see you again 👋\n\n` +
                `You're already set up:\n` +
                `🌱 Practice: ${latest?.mva || "Not set yet"}\n` +
                `🔔 Check-in time: ${latest?.reminder_time || "7:00 PM"}\n\n` +
                `Want to:`,
                Markup.inlineKeyboard([
                    [Markup.button.callback("Start completely fresh", "confirm_restart")],
                    [Markup.button.callback("Change my check-in time", "reminder_change")],
                    [Markup.button.callback("Add a new goal", "new_goal")],
                    [Markup.button.callback("Change my daily practice", "change_mva")],
                    [Markup.button.callback("Nothing, just checking in", "cancel_menu")],
                ])
            );
            return;
        }

        // If user is in the middle of onboarding (onboarding_complete = false),
        // Layer B: check DB for step resume data as fallback
        if (user && !user.onboarding_complete) {
            const resumeData = await getResumeStepFromDb(ctx.from.id);
            
            if (resumeData && resumeData.data.name) {
                // Build recap message from available data
                let recapMsg = `Hey ${resumeData.data.name}, good to see you again 👋\n\n`;
                recapMsg += `Let's pick up where we left off.\n\n`;
                
                if (resumeData.data.surfaceGoal) {
                    recapMsg += `Last time you were working on: ${resumeData.data.surfaceGoal}\n\n`;
                }
                
                if (resumeData.data.identityStatement) {
                    recapMsg += `And we landed on this: ${resumeData.data.identityStatement}\n\n`;
                }
                
                recapMsg += `Ready to continue?`;
                await ctx.reply(recapMsg);
                
                // Rehydrate wizard state with what we know
                const rehydratedState = resumeData.data;
                const resumeStep = resumeData.step;
                
                // Set cursor before calling scene.enter().
                // NOTE: This uses internal Telegraf state (ctx.session.__scenes.cursor).
                // WizardContextWizard reads ctx.scene.session.cursor at construction time
                // (line 31 of telegraf/scenes/wizard.js: ctx.scene.session.cursor ?? 0).
                // We must set it *before* enter()'s middleware runs, which constructs the WizardContextWizard.
                // Fallback if this breaks on a future Telegraf version: just restart from step 0
                // with rehydrated state, which uses only public API (less seamless, but stable).
                ctx.session ??= {};
                ctx.session.__scenes ??= {};
                ctx.session.__scenes.cursor = resumeStep;
                
                await ctx.scene.enter("onboarding", rehydratedState);
                return;
            }
        }
        
        // Brand new user or no resume data available
        return await ctx.scene.enter("onboarding");
    }

    // ── /start ─────────────────────────────────────────────────────
    bot.start(async (ctx) => {
        await startOrResumeOnboarding(ctx);
    });

    // `/restart` removed: start-fresh confirmation is handled via the
    // welcome-back menu's "Start completely fresh" button -> `confirm_restart`.

    // ── /help ──────────────────────────────────────────────────────
    bot.command("help", async (ctx) => {
        await ctx.scene.leave();
        await ctx.reply(
            `Here's what I can do:\n\n` +
            `⚡ /start — Start or restart onboarding\n` +
            `✅ /checkin — Log today's practice\n` +
            `📖 /reflect — Weekly reflection\n` +
            `📈 /progress — See your 14-day progress\n` +
            `🆘 /support — Get help from a human\n` +
            `🔄 /reminders — Manage your check-in reminders\n\n` +
            `If you ever feel stuck, just tap /start and we'll go again.`
        );
    });
    // ── /support ───────────────────────────────────────────────────
    bot.command("support", async (ctx) => {
        await ctx.scene.leave();
        await ctx.reply(
            `No worries — we're here. 🙏\n\n` +
            `For help or feedback, reach us at: support@becomingyou.app\n\n` +
            `When you're ready to pick up where you left off, just tap /start.`
        );
    });
    // ── /reminders ───────────────────────────────────────────────────
    bot.command("reminders", async (ctx) => {
        await ctx.scene.leave();
        await ctx.reply(
            `You can manage your check-in reminders here:\n\n` +
            `1️⃣ To turn reminders on or off, tap the button below.\n` +
            `2️⃣ To change the time of your reminder, tap the button below.\n\n` +
            `If you ever want to start over, just tap /start.`,
            Markup.inlineKeyboard([
                [Markup.button.callback("Toggle Reminder", "reminder_toggle")],
                [Markup.button.callback("Change Time", "reminder_change")],
            ])

        );
    });
    bot.action("reminder_toggle", async (ctx) => {
        const userId = ctx.from.id

        //get current settings from db
        const user = await getUserByTelegramId(userId)
        const newStatus = !user.reminder_enabled

        //update db
        await updateReminderStatus(userId, newStatus)
        await ctx.answerCbQuery();

        await ctx.reply(
            `Reminders are now ${newStatus ? "ON ✅" : "OFF ❌"}`
        );

    })
    bot.action("reminder_change", async (ctx) => {
        await ctx.answerCbQuery();
        if (ctx.scene?.current) {
            await ctx.scene.leave();
        }
        await ctx.scene.enter("reminder_change");
    });

    bot.action("confirm_restart", async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.reply(
            `Are you sure? This will clear your current goal and practice so you can set up a new one.`,
            Markup.inlineKeyboard([
                [Markup.button.callback("Yes, start fresh", "confirm_restart_yes")],
                [Markup.button.callback("No, keep my current setup", "confirm_restart_no")],
            ])
        );
    });

    bot.action("confirm_restart_yes", async (ctx) => {
        await ctx.answerCbQuery();
        if (ctx.scene?.current) {
            await ctx.scene.leave();
        }
        if (ctx.wizard) {
            ctx.wizard.state = {};
        }
        await ctx.reply("Okay — let's start fresh. I'll guide you through onboarding again.");
        await ctx.scene.enter("onboarding");
    });

    bot.action("confirm_restart_no", async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.reply("Cool — we'll keep your current setup. If you want to change something later, just tap /reminders.");
    });

    bot.action("change_mva", async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.reply("MVA editing is coming soon. For now, tap /start if you want to set a new one.");
    });

    bot.action("cancel_menu", async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.reply("No problem — I'm here when you're ready.");
    });
    bot.action("new_goal", async (ctx) => {
        console.log("New goal action triggered");
        await ctx.answerCbQuery();

        const user = await getUserByTelegramId(ctx.from.id);
        if (!user) {
            // Defensive fallback — this action only appears on the welcome-back
            // menu, which only existing users ever see.
            await ctx.reply(`Let's get you set up first — tap /start to begin.`);
            return;
        }

        if (ctx.scene?.current) {
            await ctx.scene.leave();
        }

        await ctx.reply(
            `Let's set up a new goal, ${user.name}. 🌱\n\n` +
            `What part of your life do you want to work on this time?`,
            domainKeyboard
        );

        // Jump straight to step2 (domain selection) — skip step0/step1
        // (greeting + name confirmation) since this user already exists
        // and their name is already on file.
        //
        // NOTE: setting cursor on ctx.session.__scenes relies on Telegraf
        // internals, same pattern already used for Layer B resume above.
        // WizardContextWizard reads ctx.scene.session.cursor at construction
        // time, so cursor must be set BEFORE scene.enter() runs. If this
        // breaks on a future Telegraf upgrade, fallback is to enter at step 0
        // with rehydrated state instead — less seamless, but uses only public API.
        ctx.session ??= {};
        ctx.session.__scenes = {
            current: "onboarding",
            state: { name: user.name },
            cursor: 2,
        };

        await ctx.scene.enter("onboarding", { name: user.name });
    });
}
// ─── Reminders Change Scene ────────────────────────────────────────────────────────
//is in bot.js, all scenes are defined in bot.js, and the reminder change scene is defined in src/scenes/reminderChangeScene.js. The reminder change scene handles the logic for changing the reminder time.