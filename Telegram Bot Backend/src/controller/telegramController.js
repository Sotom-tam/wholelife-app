import bot from "../config/bot.js"
export async function handleTelegramUpdates(req,res){
    bot.handleUpdate(req.body,res)
}