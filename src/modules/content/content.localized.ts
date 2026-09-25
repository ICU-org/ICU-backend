import { DEFAULT_LOCALE, LOCALES, type Locale } from "../i18n";

/** Текст на языках сайта: армянский обязателен, остальные — по желанию. */
export type Localized = { [DEFAULT_LOCALE]: string } & Partial<Record<Locale, string>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Проверка для express-validator: { hy: "…", ru?: "…", en?: "…" }.
 * Неизвестные языки и не-строки — ошибка; пустые переводы допустимы (уберёт clean).
 */
export const isLocalized =
  (options: { max: number; required?: boolean }) =>
  (value: unknown): true => {
    if (value === undefined || value === null) {
      if (options.required) throw new Error(`Required, ${DEFAULT_LOCALE} text is mandatory`);
      return true;
    }
    if (!isRecord(value)) throw new Error("Must be an object { hy, ru?, en? }");
    for (const [key, text] of Object.entries(value)) {
      if (!(LOCALES as readonly string[]).includes(key)) throw new Error(`Unknown language: ${key}`);
      if (typeof text !== "string") throw new Error(`${key}: must be a string`);
      if (text.trim().length > options.max) throw new Error(`${key}: at most ${options.max} characters`);
    }
    // необязательное поле, пустое на всех языках, — то же, что отсутствующее (форма шлёт все языки)
    const empty = Object.values(value).every((text) => typeof text === "string" && !text.trim());
    if (empty && !options.required) return true;
    if (typeof value[DEFAULT_LOCALE] !== "string" || !value[DEFAULT_LOCALE].trim()) {
      throw new Error(`${DEFAULT_LOCALE} text is mandatory`);
    }
    return true;
  };

/** Обрезать пробелы, выкинуть пустые переводы. Вызывать после isLocalized. */
export function cleanLocalized(value: unknown): Localized | null {
  if (!isRecord(value)) return null;
  const result: Partial<Record<Locale, string>> = {};
  for (const locale of LOCALES) {
    const text = value[locale];
    if (typeof text === "string" && text.trim()) result[locale] = text.trim();
  }
  return result[DEFAULT_LOCALE] ? (result as Localized) : null;
}

/** Текст на нужном языке; перевода нет — армянский. */
export function resolveLocalized(value: unknown, locale: Locale): string | null {
  if (!isRecord(value)) return null;
  const text = value[locale];
  if (typeof text === "string" && text) return text;
  const fallback = value[DEFAULT_LOCALE];
  return typeof fallback === "string" ? fallback : null;
}
