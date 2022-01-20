import { Scene } from "phaser";
import { tr } from "/src/i18n/init";
import { globalEvents } from "/src/scenes/common/global-events";
import { uiBuilder } from "/src/helpers/ui/ui-builder";
import { openDialogMenu } from "/src/helpers/ui/dialog-menu";

export const openGoBackMenu = (fromScene: Scene) => {
  openDialogMenu({
    scene: fromScene,
    makeDialog: ({ closeDialog, scene }) => {
      const ui = uiBuilder(scene);
      const okName = "ok";
      const dialog = ui
        .dialog(() => ({
          title: ui.title({ text: tr("goBack.title") }),
          content: ui.content({ text: tr("goBack.contents") }),
          actions: [
            ui.button({ text: tr("general.cancel") }),
            ui.button({ text: tr("general.ok") }).setName(okName),
          ],
        }))
        .layout()
        .popUp(500);
      dialog.on("button.click", (button) => {
        if (button.name === okName) {
          globalEvents.goToHub.emit({})(scene);
        } else {
          dialog.fadeOutDestroyPromise(500).then(closeDialog);
        }
      });
    },
  });
};
