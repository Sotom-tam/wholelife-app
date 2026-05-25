import {Router} from "express"
import { handleTelegramUpdates } from "../controller/telegramController.js"

const router=Router()

router.post("/",handleTelegramUpdates)

export default router