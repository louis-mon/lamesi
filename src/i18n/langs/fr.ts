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
    reloadNeeded:
      "Recharger la page est nécessaire \npour appliquer les changements",
  },
  dungeon: {
    activateSwitch:
      "Cliquer sur l'icône en surbrillance ou sur la touche {{key}}\npour frapper avec l'épée sur l'interrupteur",
    takeItem:
      "Cliquer sur l'icône en surbrillance ou sur la touche {{key}}\npour prendre l'objet",
    useItem:
      "Cliquer sur l'icône en surbrillance ou sur la touche {{key}}\npour utiliser l'objet",
  },
  credits: {
    title: "Crédits",
    graphics: "Art",
    music: "Audio",
    programming: "Programmation",
    realisation: "Conception & Realisation",
    thanks: "Remerciements speciaux",
    thankyou: "Merci d'avoir joué!",
    software: "Logiciels",
  },
};
