import "dotenv/config"

import express from "express";
import cors from "cors";
import { session,Scenes } from "telegraf";

import telegramRoutes from "./src/routes/telegramRoutes.js"
import hmmRoutes from "./src/routes/hmm.js"
const app=express()

app.use(express.json())

//The Routes
app.use('/webhook',telegramRoutes)
app.use('/',hmmRoutes)

const PORT=process.env.PORT||3000

app.listen(PORT,()=>{
    console.log(`Server is running on ${PORT}`)
})

