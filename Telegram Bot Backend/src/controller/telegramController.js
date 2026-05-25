import bot from "../config/bot"
export async function handleTelegramUpdates(req,res){
    bot.handleUpdate(req.body,res)
}