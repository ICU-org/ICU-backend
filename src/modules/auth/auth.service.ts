import prisma from "../../shared/config/prisma";
import { AppError, ErrorCode } from "../../shared/errors/AppError";
import { dummyHash, hashPassword, hashToken, newSessionToken, verifyPassword } from "./auth.crypto";

const SESSION_TTL_MS = (Number(process.env.ADMIN_SESSION_TTL_HOURS) || 12) * 60 * 60 * 1000;
/** Продлеваем, когда осталось меньше половины срока: работающего админа не выбрасывает. */
const RENEW_WHEN_LEFT_MS = SESSION_TTL_MS / 2;
/** Но не дольше недели от входа: забытая вкладка не держит вход вечно. */
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_MIN_LENGTH = 10;
const LOGIN_FORMAT = /^[a-z0-9._-]{3,64}$/;

export type AdminPrincipal = { id: string; login: string };

const normalizeLogin = (login: string) => login.trim().toLowerCase();

export async function login(loginRaw: string, password: string) {
  const admin = await prisma.adminUser.findUnique({ where: { login: normalizeLogin(loginRaw) } });
  // пароль проверяется всегда: по времени ответа нельзя понять, есть ли такой логин
  const passwordOk = await verifyPassword(password, admin?.passwordHash ?? (await dummyHash()));
  if (!admin || !admin.isActive || !passwordOk) {
    throw AppError.unauthorized(ErrorCode.INVALID_CREDENTIALS, "Invalid login or password");
  }

  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.$transaction([
    prisma.adminSession.create({ data: { tokenHash: hashToken(token), adminId: admin.id, expiresAt } }),
    prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } }),
  ]);
  return { token, expiresAt, admin: { id: admin.id, login: admin.login } };
}

export async function logout(token: string) {
  await prisma.adminSession.deleteMany({ where: { tokenHash: hashToken(token) } });
}

/**
 * Сессия по токену из cookie. Скользящий срок: если осталось меньше половины,
 * продлевается на полный срок (в пределах недели от входа); renewedUntil —
 * новый срок, чтобы обновить и cookie.
 */
export async function resolveSession(token: string): Promise<{ admin: AdminPrincipal; renewedUntil: Date | null } | null> {
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, expiresAt: true, createdAt: true, admin: { select: { id: true, login: true, isActive: true } } },
  });
  const now = Date.now();
  if (!session || session.expiresAt.getTime() <= now || !session.admin.isActive) return null;

  const admin = { id: session.admin.id, login: session.admin.login };
  if (session.expiresAt.getTime() - now >= RENEW_WHEN_LEFT_MS) return { admin, renewedUntil: null };

  const until = new Date(Math.min(now + SESSION_TTL_MS, session.createdAt.getTime() + SESSION_MAX_AGE_MS));
  if (until <= session.expiresAt) return { admin, renewedUntil: null };

  // updateMany, а не update: сессию могли удалить между чтением и записью (выход
  // в другой вкладке, --reset) — update() бросил бы P2025 → 500 вместо 401.
  // Условие «срок раньше нового», а не точное равенство прочитанному: в БД
  // время хранится в микросекундах, в JS — в миллисекундах.
  const { count } = await prisma.adminSession.updateMany({
    where: { id: session.id, expiresAt: { lt: until } },
    data: { expiresAt: until },
  });
  if (count === 1) return { admin, renewedUntil: until };
  const still = await prisma.adminSession.findUnique({ where: { id: session.id }, select: { expiresAt: true } });
  return still && still.expiresAt.getTime() > Date.now() ? { admin, renewedUntil: null } : null;
}

/** Для scripts/create-admin.ts. reset — сменить пароль существующему и закрыть его сессии. */
export async function createAdmin(loginRaw: string, password: string, options: { reset?: boolean } = {}) {
  const login = normalizeLogin(loginRaw);
  if (!LOGIN_FORMAT.test(login)) {
    throw AppError.badRequest(ErrorCode.VALIDATION_FAILED, "Login: 3–64 characters, a-z 0-9 . _ -");
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw AppError.badRequest(ErrorCode.VALIDATION_FAILED, `Password: at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  const passwordHash = await hashPassword(password);
  const existing = await prisma.adminUser.findUnique({ where: { login }, select: { id: true } });
  if (existing && !options.reset) throw AppError.conflict(`Admin "${login}" already exists — use --reset`);

  if (existing) {
    await prisma.$transaction([
      prisma.adminUser.update({ where: { id: existing.id }, data: { passwordHash, isActive: true } }),
      prisma.adminSession.deleteMany({ where: { adminId: existing.id } }),
    ]);
    return { login, created: false };
  }
  await prisma.adminUser.create({ data: { login, passwordHash } });
  return { login, created: true };
}

export async function purgeExpiredSessions() {
  const { count } = await prisma.adminSession.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  return count;
}
