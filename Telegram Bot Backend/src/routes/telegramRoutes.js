import {Router} from "express"
import { handleTelegramUpdates } from "../controller/telegramController"

const router=Router()

router.post("/",handleTelegramUpdates)

export default router