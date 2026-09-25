import { Request, Response } from "express";
import { matchedData } from "express-validator";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { AppError } from "../../shared/errors/AppError";
import { logger } from "../../shared/config/logger";
import { pickLocale } from "../i18n";
import * as contentService from "./content.service";

const localeOf = (req: Request) => pickLocale((typeof req.query.lang === "string" ? req.query.lang : "").split(","));

/** Изменения админа видны сразу — ответы не кэшируются. */
const noCache = (res: Response) => res.set("Cache-Control", "no-cache");

// ── публичное: /api/content ─────────────────────────────────────

/** GET /api/content/partners?lang= */
export const publicPartners = asyncHandler(async (req: Request, res: Response) => {
  noCache(res).json(await contentService.listPublicPartners(localeOf(req)));
});

/** GET /api/content/about?lang= */
export const publicAbout = asyncHandler(async (req: Request, res: Response) => {
  noCache(res).json(await contentService.getPublicAbout(localeOf(req)));
});

// ── служебное: /api/admin/content, под requireAdmin ─────────────

const adminLogin = (req: Request) => {
  if (!req.admin) throw AppError.unauthorized();
  return req.admin.login;
};
const idOf = (req: Request) => (matchedData(req) as { id: string }).id;

/** GET /api/admin/content/partners */
export const adminPartners = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await contentService.listAdminPartners());
});

/** POST /api/admin/content/partners — тело проверено validatePartner */
export const adminCreatePartner = asyncHandler(async (req: Request, res: Response) => {
  const partner = await contentService.createPartner(req.body);
  logger.info({ partnerId: partner.id, admin: adminLogin(req) }, "Partner created");
  res.status(201).json(partner);
});

/** PUT /api/admin/content/partners/:id */
export const adminUpdatePartner = asyncHandler(async (req: Request, res: Response) => {
  const partner = await contentService.updatePartner(idOf(req), req.body);
  logger.info({ partnerId: partner.id, admin: adminLogin(req) }, "Partner updated");
  res.json(partner);
});

/** DELETE /api/admin/content/partners/:id */
export const adminDeletePartner = asyncHandler(async (req: Request, res: Response) => {
  const id = idOf(req);
  await contentService.deletePartner(id);
  logger.info({ partnerId: id, admin: adminLogin(req) }, "Partner deleted");
  res.status(204).end();
});

/** PUT /api/admin/content/partners/:id/logo — multipart, поле logo */
export const adminSetLogo = asyncHandler(async (req: Request, res: Response) => {
  res.json(await contentService.setPartnerLogo(idOf(req), req.file?.buffer));
});

/** DELETE /api/admin/content/partners/:id/logo */
export const adminRemoveLogo = asyncHandler(async (req: Request, res: Response) => {
  res.json(await contentService.removePartnerLogo(idOf(req)));
});

/** GET /api/admin/content/about */
export const adminAbout = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await contentService.getAdminAbout());
});

/** PUT /api/admin/content/about — тело проверено validateAbout */
export const adminSaveAbout = asyncHandler(async (req: Request, res: Response) => {
  const login = adminLogin(req);
  const result = await contentService.saveAbout(req.body, login);
  logger.info({ admin: login }, "About page saved");
  res.json(result);
});
