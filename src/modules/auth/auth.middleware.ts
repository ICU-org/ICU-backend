import { BlockList, isIP } from "net";
import { Request, Response, NextFunction, CookieOptions } from "express";
import { rateLimit } from "express-rate-limit";
import { AppError } from "../../shared/errors/AppError";
import { resolveSession } from "./auth.service";

export const SESSION_COOKIE = "icu_admin";

/** SameSite=Strict + httpOnly: скрипты страницы и чужие сайты cookie не видят. */
export const sessionCookieOptions = (expires?: Date): CookieOptions => ({
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  path: "/api/admin",
  ...(expires && { expires }),
});

/*
 * Список адресов, с которых служебная часть вообще существует:
 * ADMIN_ALLOWED_IPS="127.0.0.1,::1,203.0.113.0/24". Пусто — закрыта для всех.
 * Неверная запись — ошибка при старте, а не молча открытая или закрытая админка.
 */
const allowlist = new BlockList();
for (const entry of (process.env.ADMIN_ALLOWED_IPS || "").split(",").map((s) => s.trim()).filter(Boolean)) {
  const [address, prefix] = entry.split("/");
  const version = isIP(address);
  if (!version || (prefix !== undefined && !/^\d{1,3}$/.test(prefix))) {
    throw new Error(`ADMIN_ALLOWED_IPS: invalid entry "${entry}"`);
  }
  const type = version === 6 ? "ipv6" : "ipv4";
  if (prefix === undefined) allowlist.addAddress(address, type);
  else allowlist.addSubnet(address, Number(prefix), type);
}

/*
 * nginx на том же сервере без TRUST_PROXY: у всех запросов req.ip = 127.0.0.1,
 * и loopback в списке открыл бы админку всему интернету. В production такое
 * сочетание — отказ стартовать, а не тихая дыра.
 */
if (
  process.env.NODE_ENV === "production" &&
  !process.env.TRUST_PROXY &&
  (allowlist.check("127.0.0.1", "ipv4") || allowlist.check("::1", "ipv6"))
) {
  throw new Error("ADMIN_ALLOWED_IPS contains loopback, but TRUST_PROXY is not set — behind a proxy this opens admin to everyone");
}

const isAllowed = (ip: string | undefined) => {
  if (!ip) return false;
  // IPv4, пришедший через IPv6-сокет: ::ffff:127.0.0.1
  const mapped = ip.startsWith("::ffff:") ? ip.slice(7) : null;
  if (mapped && isIP(mapped) === 4) return allowlist.check(mapped, "ipv4");
  const version = isIP(ip);
  return version !== 0 && allowlist.check(ip, version === 6 ? "ipv6" : "ipv4");
};

/**
 * Первым на /api/admin: чужому адресу — тот же 404, что у несуществующего пути,
 * снаружи не видно даже, что служебная часть есть. IP только сравнивается —
 * не сохраняется и не логируется (обращения анонимные).
 */
export const adminNetworkGuard = (req: Request, _res: Response, next: NextFunction) => {
  if (isAllowed(req.ip)) return next();
  next(AppError.notFound("Resource not found"));
};

/** Сессия админа из cookie → req.admin; нет или истекла — 401. Продлённая — новый срок и в cookie. */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  const session = typeof token === "string" && token ? await resolveSession(token) : null;
  if (!session) return next(AppError.unauthorized());
  if (session.renewedUntil) res.cookie(SESSION_COOKIE, token, sessionCookieOptions(session.renewedUntil));
  req.admin = session.admin;
  next();
};

/** Подбор пароля: 10 неудачных попыток за 15 минут с адреса. Счётчик — в памяти процесса. */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true, // удачный вход попыткой не считается
  handler: (_req, _res, next) => next(AppError.tooManyRequests("Too many login attempts")),
});
