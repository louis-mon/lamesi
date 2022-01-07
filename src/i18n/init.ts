import i18next from "i18next";
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

export const tr = (key: DottedKey) => i18next.t(key);
