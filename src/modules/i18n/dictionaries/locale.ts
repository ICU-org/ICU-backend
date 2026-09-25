// ── Настройка языков ──────────────────────────────────────────
export const LOCALES = ["hy", "ru", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Источник истины для набора ключей: команда пишет по-русски. */
export const SOURCE_LOCALE = "ru" as const satisfies Locale;
/** Сайт армянский: табло на остановках Еревана. */
export const DEFAULT_LOCALE: Locale = "hy";

/** Название языка на нём самом. */
export const LOCALE_NAMES: Record<Locale, string> = {
  hy: "Հայերեն",
  ru: "Русский",
  en: "English",
};
// ──────────────────────────────────────────────────────────────

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value);
