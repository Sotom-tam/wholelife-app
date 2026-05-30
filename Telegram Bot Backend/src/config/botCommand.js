// src/config/commands.js
export function registerGlobalCommands(bot, stage) {

    // ── /start ─────────────────────────────────────────────────────
    bot.start(async (ctx) => {
        await ctx.scene.leave();
        ctx.wizard.state = {};
        await ctx.scene.enter("onboarding");
    });

    // ── /restart ───────────────────────────────────────────────────
    bot.command("restart", async (ctx) => {
        await ctx.scene.leave();
        ctx.wizard.state = {};
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
}