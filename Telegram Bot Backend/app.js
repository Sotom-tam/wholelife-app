import "dotenv/config"

import express from "express";
import cors from "cors";
import { session,Scenes } from "telegraf";

import telegramRoutes from "./src/routes/telegramRoutes.js"
import bot,{onboardingScene} from "./src/config/bot.js"

const app=express()

app.use(express.json())

//The Routes
app.use('/webhook',telegramRoutes)

//Telegram bot set up
// 1. Register session middleware (Required for scenes)
bot.use(session());

// 2. Register the stage manager with your wizard scene
const stage = new Scenes.Stage([onboardingScene]);
bot.use(stage.middleware());


const PORT=process.env.PORT||3000

app.listen(PORT,()=>{
    console.log(`Server is running on ${PORT}`)
})

