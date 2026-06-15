import { Markup } from "telegraf";
import { getUserByTelegramId, updateReminderStatus, updateReminderTime } from "../models/user.js";
// src/config/commands.js
export function registerGlobalCommands(bot, stage) {

    // ── /start ─────────────────────────────────────────────────────
    bot.start(async (ctx) => {
        if (ctx.scene?.current) {
            await ctx.scene.leave();
        }
        if (ctx.wizard) {
            ctx.wizard.state = {};
        }
        await ctx.scene.enter("onboarding");
    });

    // ── /restart ───────────────────────────────────────────────────
    bot.command("restart", async (ctx) => {
        if (ctx.scene?.current) {
            await ctx.scene.leave();
        }
        if (ctx.wizard) {
            ctx.wizard.state = {};
        }
        await ctx.reply("Okay, starting fresh 🙂");
        await ctx.scene.enter("onboarding");
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
            `Reminders are now ${!enabled ? "ON ✅" : "OFF ❌"}`
        );

    })
    bot.action("reminder_change", async (ctx) => {
        await ctx.answerCbQuery();
        if (ctx.scene?.current) {
            await ctx.scene.leave();
        }
        await ctx.scene.enter("reminder_change");
    });
}
// ─── Reminders Change Scene ────────────────────────────────────────────────────────