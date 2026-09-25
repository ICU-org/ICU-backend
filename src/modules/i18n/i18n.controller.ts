import { Request, Response } from "express";
import { asyncHandler } from "../../shared/http/asyncHandler";
import * as i18nService from "./i18n.service";

const preferred = (req: Request) => (typeof req.query.lang === "string" ? req.query.lang : "").split(",");

/** GET /api/i18n?lang=hy,ru — словарь интерфейса на лучшем из предложенных языков */
export const getDictionary = asyncHandler(async (req: Request, res: Response) => {
  // no-cache, а не max-age: после выпуска новый фронтенд со старым словарём из кэша
  // показал бы ключи вместо текста; сверка по ETag дешёвая — 304 без тела
  res.set("Cache-Control", "no-cache");
  res.json(i18nService.getDictionary(preferred(req)));
});

/** GET /api/admin/i18n?lang=hy — тексты служебной части (под проверкой IP) */
export const getAdminDictionary = asyncHandler(async (req: Request, res: Response) => {
  res.set("Cache-Control", "private, no-cache");
  res.json(i18nService.getDictionary(preferred(req), "admin"));
});
