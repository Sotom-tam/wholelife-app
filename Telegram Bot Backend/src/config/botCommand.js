import { Markup } from "telegraf";
import { getUserByTelegramId, getUserWithLatestPractice, updateReminderStatus, updateReminderTime } from "../models/user.js";
// src/config/commands.js
export function registerGlobalCommands(bot, stage) {

    async function startOrResumeOnboarding(ctx) {
        if (ctx.scene?.current) {
            await ctx.scene.leave();
        }
        if (ctx.wizard) {
            ctx.wizard.state = {};
        }

        const user = await getUserWithLatestPractice(ctx.from.id);

        if (!user) {
            return await ctx.scene.enter("onboarding");
        }

        if (user.onboarding_complete) {
            await ctx.reply(
                `Hey ${user.name || "there"}, good to see you again 👋\n\n` +
                `You're already set up:\n` +
                `🌱 Practice: ${user.mva || "Not set yet"}\n` +
                `🔔 Check-in time: ${user.reminder_time || "7:00 PM"}\n\n` +
                `Want to:`,
                Markup.inlineKeyboard([
                    [Markup.button.callback("Start completely fresh", "confirm_restart")],
                    [Markup.button.callback("Change my check-in time", "reminder_change")],
                    [Markup.button.callback("Change my daily practice", "change_mva")],
                    [Markup.button.callback("Nothing, just checking in", "cancel_menu")],
                ])
            );
            return;
        }

        await ctx.reply(
            `Looks like we got interrupted last time — let's pick back up.`
        );
        return await ctx.scene.enter("onboarding");
    }

    // ── /start ─────────────────────────────────────────────────────
    bot.start(async (ctx) => {
        await startOrResumeOnboarding(ctx);
    });

    // ── /restart ───────────────────────────────────────────────────
    bot.command("restart", async (ctx) => {
        if (ctx.scene?.current) {
            await ctx.scene.leave();
        }
        if (ctx.wizard) {
            ctx.wizard.state = {};
        }

        const user = await getUserWithLatestPractice(ctx.from.id);

        if (!user || !user.onboarding_complete) {
            if (!user) {
                await ctx.reply("Okay, starting fresh 🙂");
            } else {
                await ctx.reply("Looks like you didn't finish last time — let's pick up where you left off.");
            }
            return await ctx.scene.enter("onboarding");
        }

        await ctx.reply(
            `Okay, starting fresh 🙂 Do you want to clear your current goal and practice for a new setup?`,
            Markup.inlineKeyboard([
                [Markup.button.callback("Yes, start fresh", "confirm_restart")],
                [Markup.button.callback("No, keep what I have", "cancel_menu")],
            ])
        );
    });

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
            `🔄 /restart — Start over from the beginning\n\n` +
            `🔄 /reminders — Manage your check-in reminders\n\n` +
            `If you ever feel stuck, just tap /restart and we'll go again.`
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
            `If you ever want to start over, just tap /restart.`,
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
        await ctx.reply("MVA editing is coming soon. For now, tap /restart if you want to set a new one.");
    });

    bot.action("cancel_menu", async (ctx) => {
        await ctx.answerCbQuery();
        await ctx.reply("No problem — I'm here when you're ready.");
    });
}
// ─── Reminders Change Scene ────────────────────────────────────────────────────────