import i18next, { TOptions } from "i18next";
import { frTranslation } from "/src/i18n/langs/fr";
import { DottedKey } from "/src/i18n/keys";

i18next.init({
  lng: "fr",
  resources: {
    fr: {
      translation: frTranslation,
    },
  },
});

export const tr = (key: DottedKey, options: TOptions = {}) =>
  i18next.t(key, options);
