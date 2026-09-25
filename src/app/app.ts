import express, { Application } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";

import { adminAuthRoutes, adminNetworkGuard, requireAdmin } from "../modules/auth";
import { contentAdminRoutes, contentRoutes } from "../modules/content";
import { feedbackAdminRoutes, feedbackRoutes } from "../modules/feedback";
import { i18nAdminRoutes, i18nRoutes } from "../modules/i18n";
import { logger } from "../shared/config/logger";
import { UPLOADS_DIR } from "../shared/config/uploads";
import { requestLogger } from "../shared/http/requestLogger";
import { errorHandler, notFoundHandler } from "../shared/http/errorHandler";

const app: Application = express();

/*
 * За reverse proxy (nginx) req.ip — адрес прокси. TRUST_PROXY говорит, скольким
 * прокси верить (число) или каким адресам ("loopback"). Без него X-Forwarded-For
 * игнорируется — подделать адрес для списка админов нельзя. "true" не принимаем.
 */
const TRUST_PROXY = process.env.TRUST_PROXY;
if (TRUST_PROXY) app.set("trust proxy", /^\d+$/.test(TRUST_PROXY) ? Number(TRUST_PROXY) : TRUST_PROXY);

// 0. логирование с request-id — первым, чтобы в лог попали и отказы CORS
app.use(requestLogger);

// 1. заголовки безопасности
app.use(helmet());

// 2. CORS — до маршрутов
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:5174")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true); // curl, server-to-server
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      // Не ошибка: иначе неверный CORS_ORIGINS выглядит как 500 «сервер упал».
      // Без CORS-заголовков браузер сам не отдаст ответ странице.
      logger.warn({ origin }, "CORS: origin not allowed — check CORS_ORIGINS");
      return callback(null, false);
    },
    credentials: true, // cookie сессии админа
    exposedHeaders: ["X-Request-Id", "Content-Disposition", "X-Export-Count"],
  })
);

// 3. парсер: API принимает только JSON, обращение — короткий текст.
// /api/admin/content разбирается своим парсером с лимитом больше — и только
// после проверки адреса и сессии (4a): посторонний не отправит большое тело.
const ADMIN_CONTENT_PATH = "/api/admin/content";
const smallJson = express.json({ limit: "16kb" });
app.use((req, res, next) => (req.path.startsWith(ADMIN_CONTENT_PATH) ? next() : smallJson(req, res, next)));
app.use(cookieParser());

// 4. маршруты модулей
app.use("/api/feedback", feedbackRoutes);
app.use("/api/i18n", i18nRoutes);
app.use("/api/content", contentRoutes);

// логотипы: имена файлов — случайные uuid, содержимое не меняется → долгий кэш;
// CORP cross-origin — иначе helmet запретит фронтенду с другого порта их показать
app.use(
  "/uploads",
  express.static(UPLOADS_DIR, {
    index: false,
    dotfiles: "deny",
    fallthrough: true,
    immutable: true,
    maxAge: "30d",
    setHeaders: (res) => res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"),
  })
);

// 4a. служебная часть: сначала адрес (чужому — 404), потом сессия
app.use("/api/admin", adminNetworkGuard);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/i18n", i18nAdminRoutes);
app.use("/api/admin/feedback", requireAdmin, feedbackAdminRoutes);
// «О нас» на трёх языках: армянский и русский — 2 байта на символ, до ~40 КБ
app.use(ADMIN_CONTENT_PATH, requireAdmin, express.json({ limit: "128kb" }), contentAdminRoutes);

// 5. 404 и 6. единый обработчик ошибок
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
