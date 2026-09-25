import "dotenv/config";
import app from "./app/app";
import { purgeExpiredSessions } from "./modules/auth";
import { purgeOldFeedback } from "./modules/feedback";
import { logger } from "./shared/config/logger";

const REQUIRED_ENV_VARS = ["DATABASE_URL"];

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  // console, а не logger: в dev pino пишет асинхронно, и при немедленном exit
  // сообщение не успевает попасть в вывод
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 5002;

/** Удаление старых обращений (2 месяца, только выгруженные) и истёкших сессий. */
const MAINTENANCE_INTERVAL_MS = 6 * 60 * 60 * 1000;
async function runMaintenance() {
  try {
    const [deletedFeedback, deletedSessions] = await Promise.all([purgeOldFeedback(), purgeExpiredSessions()]);
    if (deletedFeedback || deletedSessions) logger.info({ deletedFeedback, deletedSessions }, "Maintenance done");
  } catch (err) {
    logger.error({ err }, "Maintenance failed");
  }
}

// Express 5 передаёт в колбэк ошибку запуска (например, порт занят) —
// без проверки в лог ушло бы «Server started», а процесс молча завершился
app.listen(PORT, (error?: Error) => {
  if (error) {
    console.error(`Failed to start server on port ${PORT}: ${error.message}`);
    process.exit(1);
  }
  logger.info({ port: PORT, env: process.env.NODE_ENV ?? "not set" }, "Server started");
  void runMaintenance();
  setInterval(() => void runMaintenance(), MAINTENANCE_INTERVAL_MS).unref();
});

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});
