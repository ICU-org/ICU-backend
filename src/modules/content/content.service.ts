import { Prisma } from "@prisma/client";
import prisma from "../../shared/config/prisma";
import { logger } from "../../shared/config/logger";
import { AppError } from "../../shared/errors/AppError";
import type { Locale } from "../i18n";
import { cleanLocalized, resolveLocalized, type Localized } from "./content.localized";
import { logoUrl, removeLogo, storeLogo } from "./content.upload";
import type { PARTNER_SERVICES, PARTNER_TYPES } from "./content.validation";

// ── партнёры ──────────────────────────────────────────────────────

export type PartnerInput = {
  name: unknown;
  description?: unknown;
  type: (typeof PARTNER_TYPES)[number];
  services: Array<(typeof PARTNER_SERVICES)[number]>;
  vehicleCount?: number | null;
  partnerSince?: number | null;
  sortOrder?: number;
  isVisible: boolean;
};

const PARTNER_ORDER = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];

/** Тело запроса (уже проверенное) → данные для БД: тексты очищены, повторы тегов убраны. */
const partnerData = (input: PartnerInput) => ({
  name: cleanLocalized(input.name) as Localized,
  description: cleanLocalized(input.description) ?? Prisma.DbNull,
  type: input.type,
  services: [...new Set(input.services)],
  vehicleCount: input.vehicleCount ?? null,
  partnerSince: input.partnerSince ?? null,
  sortOrder: input.sortOrder ?? 0,
  isVisible: input.isVisible,
});

type PartnerRow = Prisma.PartnerGetPayload<object>;

/** Для админа: все языки, скрытые тоже. */
const toAdminPartner = ({ logoFile, ...partner }: PartnerRow) => ({ ...partner, logoUrl: logoUrl(logoFile) });

/** Для сайта: один язык, без служебных полей. */
const toPublicPartner = (partner: PartnerRow, locale: Locale) => ({
  id: partner.id,
  name: resolveLocalized(partner.name, locale),
  description: resolveLocalized(partner.description, locale),
  type: partner.type,
  services: partner.services,
  vehicleCount: partner.vehicleCount,
  partnerSince: partner.partnerSince,
  logoUrl: logoUrl(partner.logoFile),
});

export async function listPublicPartners(locale: Locale) {
  const rows = await prisma.partner.findMany({ where: { isVisible: true }, orderBy: PARTNER_ORDER });
  return { items: rows.map((row) => toPublicPartner(row, locale)) };
}

export async function listAdminPartners() {
  const rows = await prisma.partner.findMany({ orderBy: PARTNER_ORDER });
  return { items: rows.map(toAdminPartner) };
}

export const createPartner = async (input: PartnerInput) =>
  toAdminPartner(await prisma.partner.create({ data: partnerData(input) }));

async function findPartner(id: string) {
  const partner = await prisma.partner.findUnique({ where: { id } });
  if (!partner) throw AppError.notFound("Partner not found");
  return partner;
}

/** Запись исчезла между проверкой и изменением (удалил другой админ) — 404, а не 500. */
const notFoundIfGone = (err: unknown): never => {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    throw AppError.notFound("Partner not found");
  }
  throw err;
};

export async function updatePartner(id: string, input: PartnerInput) {
  await findPartner(id);
  const updated = await prisma.partner.update({ where: { id }, data: partnerData(input) }).catch(notFoundIfGone);
  return toAdminPartner(updated);
}

export async function deletePartner(id: string) {
  const partner = await findPartner(id);
  await prisma.partner.delete({ where: { id } }).catch(notFoundIfGone);
  await removeOldLogo(partner.logoFile);
}

/** Старый файл больше ни на что не ссылается; не удалился — сирота на диске, но не ошибка для админа. */
async function removeOldLogo(fileName: string | null) {
  try {
    await removeLogo(fileName);
  } catch (err) {
    logger.warn({ err, fileName }, "Old partner logo was not removed");
  }
}

/**
 * Поменять logoFile, только если в записи всё ещё тот файл, что мы прочитали:
 * при двух одновременных заменах (двойной клик) иначе один файл остался бы
 * сиротой. Не совпало — перечитываем и пробуем снова.
 */
async function swapLogo(id: string, next: string | null) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { logoFile: previous } = await findPartner(id);
    const { count } = await prisma.partner.updateMany({ where: { id, logoFile: previous }, data: { logoFile: next } });
    if (count === 1) {
      if (previous !== next) await removeOldLogo(previous);
      return toAdminPartner(await findPartner(id));
    }
  }
  throw AppError.conflict("Logo is being changed concurrently — try again");
}

/** Новый логотип: сначала проверенный файл на диск, потом запись. */
export async function setPartnerLogo(id: string, data: Buffer | undefined) {
  await findPartner(id);
  const fileName = await storeLogo(data);
  try {
    return await swapLogo(id, fileName);
  } catch (err) {
    // запись не изменилась (партнёра удалили, конфликт) — новый файл никому не нужен
    await removeOldLogo(fileName);
    throw err;
  }
}

export const removePartnerLogo = (id: string) => swapLogo(id, null);

// ── «О нас» ───────────────────────────────────────────────────────

const ABOUT_SLUG = "about";

export type AboutData = {
  intro: Localized;
  stats: Array<{ value: string; label: Localized }>;
  activities: Localized[];
  contacts: { address: Localized | null; hours: Localized | null; phone: string | null; email: string | null };
};

type AboutInput = {
  intro: unknown;
  stats: Array<{ value: string; label: unknown }>;
  activities: unknown[];
  contacts: { address?: unknown; hours?: unknown; phone?: string | null; email?: string | null };
};

/** Проверенное тело → ровно ожидаемая форма: лишние поля не попадают в БД. */
const aboutData = (input: AboutInput): AboutData => ({
  intro: cleanLocalized(input.intro) as Localized,
  stats: input.stats.map((s) => ({ value: s.value.trim(), label: cleanLocalized(s.label) as Localized })),
  activities: input.activities.map((a) => cleanLocalized(a) as Localized),
  contacts: {
    address: cleanLocalized(input.contacts.address),
    hours: cleanLocalized(input.contacts.hours),
    phone: input.contacts.phone?.trim() || null,
    email: input.contacts.email?.trim() || null,
  },
});

const readAbout = async () => {
  const row = await prisma.pageContent.findUnique({ where: { slug: ABOUT_SLUG } });
  return row ? { data: row.data as unknown as AboutData, updatedAt: row.updatedAt, updatedBy: row.updatedBy } : null;
};

/** Для админа — все языки; ещё не заполнено — null. */
export const getAdminAbout = async () => ({ about: await readAbout() });

/** Для сайта — один язык; ещё не заполнено — null (фронтенд покажет заглушку). */
export async function getPublicAbout(locale: Locale) {
  const about = await readAbout();
  if (!about) return { about: null };
  const { intro, stats, activities, contacts } = about.data;
  return {
    about: {
      intro: resolveLocalized(intro, locale),
      stats: stats.map((s) => ({ value: s.value, label: resolveLocalized(s.label, locale) })),
      activities: activities.map((a) => resolveLocalized(a, locale)),
      contacts: {
        address: resolveLocalized(contacts.address, locale),
        hours: resolveLocalized(contacts.hours, locale),
        phone: contacts.phone,
        email: contacts.email,
      },
    },
  };
}

export async function saveAbout(input: AboutInput, updatedBy: string) {
  const data = aboutData(input) as unknown as Prisma.InputJsonValue;
  await prisma.pageContent.upsert({
    where: { slug: ABOUT_SLUG },
    create: { slug: ABOUT_SLUG, data, updatedBy },
    update: { data, updatedBy },
  });
  return getAdminAbout();
}
