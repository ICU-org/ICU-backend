import type { Locale, SOURCE_LOCALE } from "./locale";

type SourceLocale = typeof SOURCE_LOCALE;

export type Section<Keys extends string> = Record<Locale, Record<Keys, string>>;

/**
 * Раздел словаря. Ключи выводятся из языка-источника; остальные языки обязаны
 * повторить набор — иначе бэкенд не соберётся.
 */
export function defineSection<Keys extends string>(
  section: Record<SourceLocale, Record<Keys, string>> &
    Record<Exclude<Locale, SourceLocale>, Record<NoInfer<Keys>, string>>
): Section<Keys> {
  return section;
}
