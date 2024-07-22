import i18next, { TOptions } from "i18next";
import { frTranslation } from "/src/i18n/langs/fr";
import { DottedKey } from "/src/i18n/keys";
import { enTranslation } from "/src/i18n/langs/en";
import { sortBy } from "lodash";
import * as Flow from "/src/helpers/phaser-flow";
import { globalData, otherGlobalData } from "/src/scenes/common/global-data";

export const languageResources = {
  fr: {
    translation: frTranslation,
  },
  en: {
    translation: enTranslation,
  },
} as const;

export const languages: readonly string[] = sortBy(
  Object.keys(languageResources),
);

i18next.init({
  lng: "fr",
  resources: languageResources,
});

export function languageSvgKey(lang: string) {
  return `flag.${lang}`;
}

export const tr = (key: DottedKey, options: TOptions = {}) =>
  i18next.t(key, options);

export const syncLanguage: Flow.PhaserNode = Flow.lazy((scene) =>
  Flow.observe(otherGlobalData.language.dataSubject, (lang) =>
    Flow.call(() => i18next.changeLanguage(lang)),
  ),
);
