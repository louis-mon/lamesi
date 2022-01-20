import { openDialogMenu } from "/src/helpers/ui/dialog-menu";
import { uiBuilder } from "/src/helpers/ui/ui-builder";
import { tr } from "/src/i18n/init";
import { Scene } from "phaser";
import { globalEvents } from "/src/scenes/common/global-events";
import { resetGameData } from "/src/scenes/game/pre-boot";

const confirmEraseData = (fromScene: Scene) =>
  openDialogMenu({
    scene: fromScene,
    makeDialog: ({ closeDialog, scene }) => {
      const ui = uiBuilder(scene);
      const okName = "ok";
      const dialog = ui
        .dialog(() => ({
          content: ui.content({ text: tr("options.confirmEraseData") }),
          actions: [
            ui.button({ text: tr("general.cancel") }),
            ui.button({ text: tr("general.ok") }).setName(okName),
          ],
        }))
        .layout()
        .popUp(500);
      dialog.on("button.click", (button) => {
        if (button.name === okName) {
          resetGameData(scene.game);
          globalEvents.goToHub.emit({})(scene);
        } else {
          dialog.fadeOutDestroyPromise(500).then(closeDialog);
        }
      });
    },
  });

export const openOptionsMenu = (fromScene: Scene) =>
  openDialogMenu({
    scene: fromScene,
    makeDialog: ({ closeDialog, scene }) => {
      const ui = uiBuilder(scene);
      const dialog = ui
        .dialog(() => ({
          title: ui.title({ text: tr("options.title") }),
          content: scene.rexUI.add
            .sizer({
              orientation: "v",
            })
            .add(
              ui
                .button({ text: tr("options.eraseData") })
                .onClick(() => confirmEraseData(scene)),
            )
            .layout(),
          actions: [ui.button({ text: tr("general.close") })],
        }))
        .layout()
        .popUp(500);
      dialog.on("button.click", (button) => {
        dialog.fadeOutDestroyPromise(500).then(closeDialog);
      });
    },
  });
