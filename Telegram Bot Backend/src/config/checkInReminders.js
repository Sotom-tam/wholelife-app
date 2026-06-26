// src/config/checkinReminder.js
import cron from "node-cron";
import { getUsersDueForReminder,markReminderSent } from "../models/reminderModel.js";
import { sendCheckinMessage } from "./notifications.js";

export function startCheckinCron(bot) {
    // Runs every minute
    cron.schedule("* * * * *", async () => {
        console.log("Running checkin reminder cron job...");
        try {
            const users = await getUsersDueForReminder();

            for (const user of users) {
                try {
                    await sendCheckinMessage(
                        bot,
                        user.telegram_id,
                        user.name,
                        user.mva,
                        user.mva_id,
                        user.current_date
                    );
                    await markReminderSent(user.telegram_id);
                } catch (err) {
                    // Log per-user failures without killing the whole cron tick
                    console.error(`Failed to send checkin to ${user.telegram_id}:`, err.message);
                }
            }
        } catch (err) {
            console.error("Checkin cron error:", err.message);
        }
    });
}