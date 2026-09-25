import { DICTIONARIES, type DictionaryScope } from "./dictionaries";
import { DEFAULT_LOCALE, LOCALES, LOCALE_NAMES, isLocale, type Locale } from "./dictionaries/locale";

/** Первый поддерживаемый язык из списка предпочтений; «ru-RU» считается как «ru». */
export const pickLocale = (preferred: string[]): Locale => {
  for (const tag of preferred) {
    const base = tag.trim().split("-")[0]?.toLowerCase();
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
};

const LOCALE_LIST = LOCALES.map((code) => ({ code, name: LOCALE_NAMES[code] }));

export const getDictionary = (preferred: string[], scope: DictionaryScope = "public") => {
  const locale = pickLocale(preferred);
  return {
    locale,
    defaultLocale: DEFAULT_LOCALE,
    locales: LOCALE_LIST,
    messages: DICTIONARIES[scope][locale],
  };
};
