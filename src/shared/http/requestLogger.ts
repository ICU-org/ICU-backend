import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import { errorSerializer, logger } from "../config/logger";

/*
 * Обращения анонимные: в лог запроса не попадают IP, порт и заголовки
 * (x-forwarded-for, user-agent, cookie). По умолчанию pino-http пишет их все —
 * поэтому сериализаторы перечисляют только разрешённые поля.
 */

/** Чужой id принимаем, только если он похож на id, — иначе в лог и в ответ уйдёт что угодно. */
const REQUEST_ID_FORMAT = /^[A-Za-z0-9._-]{1,64}$/;
export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers["x-request-id"];
    const candidate = Array.isArray(existing) ? existing[0] : existing;
    const id = candidate && REQUEST_ID_FORMAT.test(candidate) ? candidate : randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  serializers: {
    req: (req: { id: unknown; method: string; url: string }) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
    // иначе pino-http подставит стандартный, который пишет все поля ошибки и цепочку cause
    err: errorSerializer,
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
});
