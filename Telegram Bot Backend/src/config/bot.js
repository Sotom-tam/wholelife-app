//My first bot
import { Telegraf,Markup,Scenes } from "telegraf";

const bot= new Telegraf(process.env.BOT_TOKEN)
export const onboardingScene= new Scenes.WizardScene(
    'onboarding',//Scene ID,
    async function step0(ctx) {
        await ctx.reply(`Welcome I'm BecomingYou your AI Assitant that'll help you stay on track to becoming who you aspire to be`)
        await ctx.reply(`Can I call you ${ctx.from.first_name}?`,
            Markup.inlineKeyboard([
                Markup.button.callback('Yes','action_yes'),
                Markup.button.callback("No",'action_no')
            ])
        )
        return ctx.wizard.next()
    },
    async function step1(ctx){
        //checking if it was a message text, so user answered instead
        if(ctx.message?.text){
            ctx.wizard.state.name = ctx.message.text
            await ctx.reply(`Okay ${ctx.message.text}
                \nWhat is your goal?
                \nTo answer this more clearly you should thinking deeply about the person you want to be
                \nAbout how this goal will get you closer to becoming that person`
            )
            return ctx.wizard.next()
        }
        //first I check what the user picked with ctx.btnquery.callback
        if(!ctx.callbackQuery){
            await ctx.reply(`
                Is that what you want be to call you?
                \nIf not please click Yes or No Above
            `)
            return
        }
        console.log("This is what contect callback query data looks like:",ctx.callbackQuery.data)
        //Stops the loading on button
        await ctx.answerCbQuery()

        //Checking user answer
        if(ctx.callbackQuery.data==="action_yes"){
            ctx.wizard.state.name=ctx.from.first_name
            console.log("want to see the state object:",ctx.wizard.state,ctx.wizard.state.name)
            await ctx.reply(`Okay ${ctx.from.first_name}`)
            return ctx.wizard.next()
        }else{//User clicked No
            await ctx.reply(`Then What should I call you?`)
            return
        }
        
    },
    async function step2(ctx) {
        if (!ctx.message?.text) return
        ctx.wizard.state.goal = ctx.message.text
        await ctx.reply(`Now We're going somewhere!
            \nWhat is the smallest possible Action you could perform everyday that would help you achieve that goal?
            \n(The Minimum Viable Action)
        `)
        return ctx.wizard.next()      
    },
    async function step3(ctx) {
        // Receive MVA
        if (!ctx.message?.text) return
        ctx.wizard.state.mva = ctx.message.text
        await ctx.reply(`Perfect
            \nI'll help you stay consistent and remind you to complete your Minimum Viable Action (MVA) everyday!
        `)
        return ctx.scene.leave()      
    }
)
//Registering My bot Observers


//When the bot starts it should enter the onboarding scene
bot.start(async(ctx)=>{
    ctx.scene.enter('onboarding')
})

export default bot