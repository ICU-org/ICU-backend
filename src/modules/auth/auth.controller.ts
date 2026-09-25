import { Request, Response } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { AppError } from "../../shared/errors/AppError";
import { SESSION_COOKIE, sessionCookieOptions } from "./auth.middleware";
import * as authService from "./auth.service";

/** GET /api/admin/auth/access — дошли сюда, значит адрес в списке; иначе был бы 404 */
export const access = (_req: Request, res: Response) => {
  res.status(204).end();
};

/** POST /api/admin/auth/login — поля проверены валидатором в цепочке маршрута */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { token, expiresAt, admin } = await authService.login(req.body.login, req.body.password);
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  res.json({ admin });
});

/** POST /api/admin/auth/logout — работает и с истёкшей сессией: cookie стирается в любом случае */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token === "string" && token) await authService.logout(token);
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
  res.status(204).end();
});

/** GET /api/admin/auth/me */
export const me = (req: Request, res: Response) => {
  if (!req.admin) throw AppError.unauthorized();
  res.json({ admin: req.admin });
};
