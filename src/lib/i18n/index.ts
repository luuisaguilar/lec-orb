"use client";

import { createContext, useContext } from "react";
import esMX, { type DictionaryKey } from "./dictionaries/es-MX";
import enUS from "./dictionaries/en-US";

export type Locale = "es-MX" | "en-US";

const dictionaries: Record<Locale, Record<DictionaryKey, string>> = {
    "es-MX": esMX,
    "en-US": enUS,
};

export const I18nContext = createContext<Locale>("es-MX");

export function getDictionary(locale: Locale): Record<DictionaryKey, string> {
    return dictionaries[locale] || dictionaries["es-MX"];
}

export function translate(locale: Locale, key: DictionaryKey): string {
    const dict = getDictionary(locale);
    return dict[key] || key;
}

export function useI18n() {
    const locale = useContext(I18nContext);

    function t(key: DictionaryKey): string {
        return translate(locale, key);
    }

    return { t, locale };
}

export type { DictionaryKey };
