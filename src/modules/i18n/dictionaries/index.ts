import { LOCALES, type Locale } from "./locale";
import type { Section } from "./defineSection";
import { about } from "./about";
import { admin } from "./admin";
import { common } from "./common";
import { errors } from "./errors";
import { feedback } from "./feedback";
import { nav } from "./nav";
import { pages } from "./pages";
import { partners } from "./partners";
import { validation } from "./validation";

/** Публичные разделы — для всех. Новый раздел достаточно дописать сюда. */
const PUBLIC_SECTIONS = { about, common, errors, feedback, nav, pages, partners, validation } as const;
/** Служебные — только через /api/admin/i18n. */
const ADMIN_SECTIONS = { admin } as const;

export type DictionaryScope = "public" | "admin";

/** Хранится «раздел → язык», отдаётся «язык → раздел». Собирается один раз. */
const byLocale = (sections: Record<string, Section<string>>) =>
  Object.fromEntries(
    LOCALES.map((locale) => [
      locale,
      Object.fromEntries(Object.entries(sections).map(([name, section]) => [name, section[locale]])),
    ])
  ) as Record<Locale, Record<string, Record<string, string>>>;

export const DICTIONARIES: Record<DictionaryScope, ReturnType<typeof byLocale>> = {
  public: byLocale(PUBLIC_SECTIONS),
  admin: byLocale(ADMIN_SECTIONS),
};
