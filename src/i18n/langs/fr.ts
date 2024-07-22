import { TranslationKeys } from "/src/i18n/keys";

export const frTranslation: TranslationKeys = {
  general: {
    ok: "OK",
    cancel: "Annuler",
    close: "Retour",
  },
  goBack: {
    contents: `En retournant au hub, la progression dans cette énigme ne sera pas enrengistrée.`,
    title: "Retourner au hub",
  },
  options: {
    title: "Options",
    eraseData: "Effacer les données de sauvegarde",
    confirmEraseData:
      "Etes vous sur de vouloir effacer les données de sauvegarde ? Toute progression sera perdue",
  },
  dungeon: {
    activateSwitch:
      "Clicker sur l'icône en surbrillance ou sur la touche {{key}}\npour activer l'interrupteur",
    takeItem:
      "Clicker sur l'icône en surbrillance ou sur la touche {{key}}\npour prendre l'objet",
    useItem:
      "Clicker sur l'icône en surbrillance ou sur la touche {{key}}\npour utiliser l'objet",
  },
};
