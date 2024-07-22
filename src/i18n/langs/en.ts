import { TranslationKeys } from "/src/i18n/keys";

export const enTranslation: TranslationKeys = {
  general: {
    ok: "OK",
    cancel: "Cancel",
    close: "Back",
  },
  goBack: {
    contents: `By going back to main hub, progress in this puzzle will be lost.`,
    title: "Go back to hub",
  },
  options: {
    title: "Options",
    eraseData: "Reset save data",
    confirmEraseData:
      "Are you sure you want to erase save data ? All progress will be lost",
  },
  dungeon: {
    activateSwitch:
      "Click on the highlighted icon or on the key {{key}}\nto activate the switch",
    takeItem:
      "Click on the highlighted icon or on the key {{key}}\nto take the item",
    useItem:
      "Click on the highlighted icon or on the key {{key}}\nto use the item",
  },
};
