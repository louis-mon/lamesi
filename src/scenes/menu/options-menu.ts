import { openDialogMenu } from "/src/helpers/ui/dialog-menu";
import { uiBuilder } from "/src/helpers/ui/ui-builder";
import { languages, languageSvgKey, tr } from "/src/i18n/i18n";
import { Scene } from "phaser";
import { globalEvents } from "/src/scenes/common/global-events";
import { resetGameData } from "/src/scenes/game/pre-boot";
import { gameHeight, gameWidth } from "/src/scenes/common/constants";
import { otherGlobalData } from "/src/scenes/common/global-data";
import * as Flow from "/src/helpers/phaser-flow";
import UIPlugins from "phaser3-rex-plugins/templates/ui/ui-plugin";
import Label = UIPlugins.Label;

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

      const createLangButtons = () =>
        languages.map((lang, i) => {
          return scene.add
            .image(0, 0, languageSvgKey(lang))
            .setOrigin(0.5, 0.5)
            .setDepth(1)
            .setScale(0.6)
            .on("pointerdown", () => {
              otherGlobalData.language.setValue(lang)(scene);
            })
            .setName(languageSvgKey(lang))
            .setInteractive();
        });

      const reloadNeededKey = "reload-needed";

      const dialog = ui
        .dialog(() => ({
          title: ui.title({ text: tr("options.title") }),
          width: gameWidth / 2,
          height: gameHeight / 2,
          content: scene.rexUI.add
            .sizer({
              orientation: "v",
            })
            .add(
              ui
                .button({ text: tr("options.eraseData") })
                .onClick(() => confirmEraseData(scene)),
            )
            .add(
              scene.rexUI.add
                .sizer({
                  orientation: "h",
                  space: { top: 24 },
                })
                .add(
                  scene.rexUI.add.buttons({
                    space: { top: 48, item: 24, bottom: 24 },
                    buttons: createLangButtons(),
                  }),
                ),
            )
            .add(
              ui
                .content({ text: tr("options.reloadNeeded") })
                .setVisible(false)
                .setName(reloadNeededKey),
            )
            .layout(),
          actions: [ui.button({ text: tr("general.close") })],
        }))
        .layout();

      const popUpPromise = dialog.popUpPromise(500);

      const selectedLangRect = scene.add.rectangle(0, 0, 0, 0, 0x0000ff);
      scene.tweens.add({
        targets: selectedLangRect,
        props: { alpha: 0 },
        yoyo: true,
        repeat: -1,
        ease: Phaser.Math.Easing.Quadratic.In,
      });
      const originalLang: string = otherGlobalData.language.value(scene);
      popUpPromise.then(() => {
        Flow.runScene(
          scene,
          Flow.observe(otherGlobalData.language.dataSubject(scene), (lang) =>
            Flow.call(() => {
              const button = scene.children.getByName(
                languageSvgKey(lang),
              ) as Phaser.GameObjects.Image;
              if (!button) {
                return;
              }
              (scene.children.getByName(reloadNeededKey) as Label).setVisible(
                originalLang !== lang,
              );
              selectedLangRect.x = button.x;
              selectedLangRect.y = button.y;
              selectedLangRect.width = button.displayWidth + 24;
              selectedLangRect.height = button.displayHeight + 24;
              selectedLangRect.setOrigin(0.5, 0.5);
            }),
          ),
        );
      });

      dialog.on("button.click", (button) => {
        dialog.fadeOutDestroyPromise(500).then(closeDialog);
      });
    },
  });
