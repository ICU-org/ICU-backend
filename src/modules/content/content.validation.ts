import { body, param, query } from "express-validator";
import { isLocalized } from "./content.localized";

export const PARTNER_TYPES = ["GOV", "CARRIER", "PRIVATE"] as const;
export const PARTNER_SERVICES = ["GPS", "CAMERAS", "ANALYTICS", "MAINTENANCE"] as const;

/** ?lang=hy,ru — как у /api/i18n */
export const validateLang = [query("lang").optional().isString().isLength({ max: 200 })];

export const validatePartnerId = [param("id").isUUID()];

/** Партнёр целиком — и при создании, и при изменении (PUT). */
export const validatePartner = [
  body("name").custom(isLocalized({ max: 120, required: true })),
  body("description").custom(isLocalized({ max: 600 })),
  body("type").isIn(PARTNER_TYPES),
  body("services").isArray({ max: PARTNER_SERVICES.length }),
  body("services.*").isIn(PARTNER_SERVICES),
  // toInt: "5" строкой прошла бы isInt и уронила Prisma (Int) с 500
  body("vehicleCount").optional({ values: "null" }).isInt({ min: 0, max: 1_000_000 }).toInt(),
  body("partnerSince").optional({ values: "null" }).isInt({ min: 1990, max: new Date().getUTCFullYear() + 1 }).toInt(),
  body("sortOrder").optional().isInt({ min: -10_000, max: 10_000 }).toInt(),
  body("isVisible").isBoolean({ strict: true }),
];

/** «О нас» целиком (PUT). */
export const validateAbout = [
  body("intro").custom(isLocalized({ max: 1000, required: true })),
  body("stats").isArray({ max: 6 }),
  body("stats.*.value").isString().bail().trim().isLength({ min: 1, max: 20 }),
  body("stats.*.label").custom(isLocalized({ max: 80, required: true })),
  body("activities").isArray({ max: 20 }),
  body("activities.*").custom(isLocalized({ max: 200, required: true })),
  body("contacts").isObject(),
  body("contacts.address").custom(isLocalized({ max: 200 })),
  body("contacts.hours").custom(isLocalized({ max: 100 })),
  // пусто — null (так шлёт форма); false/0 — не пропускаем: сервис ждёт строку
  body("contacts.phone").optional({ values: "null" }).isString().bail().trim().matches(/^[+\d\s()-]{3,30}$/),
  body("contacts.email").optional({ values: "null" }).isString().bail().trim().isEmail().isLength({ max: 120 }),
];
