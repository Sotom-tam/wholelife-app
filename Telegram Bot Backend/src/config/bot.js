//My first bot
import { Telegraf,Markup } from "telegraf";

const bot= new Telegraf(process.env.BOT_TOKEN)

//Registering My bot Observers

bot.start(async (ctx)=>{
    console.log("The context Object:",ctx)
    try {
        await ctx.reply(`Welcome I'm BecomingYou your assitant that'll help you stay on track to becoming who you aspire to be`)
        await ctx.reply(`Can I call you ${ctx.from.first_name}?`,
            Markup.inlineKeyboard([
                Markup.button.callback('Yes','action_yes'),
                Markup.button.callback("No",'action_no')
            ])
        )
    } catch (error) {
        console.error("Error sending messages:", error);
    }
})

bot.action('action_yes',async(ctx)=>{
    await ctx.reply(`Okay ${ctx.from.first_name}`)
})

bot.action('action_no',async(ctx)=>{
    await ctx.reply(`Then What should I call you?`)
})

export default bot