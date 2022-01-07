import { Scene } from "phaser";
import { tr } from "/src/i18n/init";
import { globalEvents } from "/src/scenes/common/global-events";
import { uiBuilder } from "/src/helpers/ui/ui-builder";
import { masterSceneKey } from "/src/scenes/common/constants";
import { compact } from "lodash";

type DialogSceneParams = {
  create: (scene: Scene) => void;
};

class DialogScene extends Scene {
  p: DialogSceneParams;

  constructor(p: DialogSceneParams) {
    super({});
    this.p = p;
  }

  create() {
    this.p.create(this);
  }
}

export const openGoBackMenu = (scene: Scene) => {
  scene.scene.add(
    "dialog",
    new DialogScene({ create: createGoBackMenu }),
    true,
  );
};

const createGoBackMenu = (scene: Scene) => {
  const pausedScenes = compact(
    scene.scene.manager.getScenes().map((s) => {
      if (s.scene.key === masterSceneKey || s === scene) return;
      s.scene.pause();
      return s.scene.key;
    }),
  );
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
      dialog.fadeOutDestroyPromise(500).then(() => {
        pausedScenes.forEach((sKey) => scene.scene.resume(sKey));
        scene.scene.remove();
      });
    }
  });
};
