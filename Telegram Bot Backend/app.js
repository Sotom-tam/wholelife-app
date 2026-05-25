import "dotenv/config"

import express from "express";
import cors from "cors";

import telegramRoutes from "./src/routes/telegramRoutes"

const app=express()

app.use(express.json())

//The Routes
app.use('/webhook',telegramRoutes)

const PORT=process.env.PORT||3000

app.listen(PORT,()=>{
    console.log(`Server is running on ${PORT}`)
})

