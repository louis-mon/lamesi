import { Scene } from "phaser";
import { masterSceneKey } from "/src/scenes/common/constants";
import { compact, uniqueId } from "lodash";

type DialogSceneParams = {
  create: (scene: Scene) => void;
  key: string;
};

class DialogScene extends Scene {
  p: DialogSceneParams;

  constructor(p: DialogSceneParams) {
    super({ key: p.key });
    this.p = p;
  }

  create() {
    this.p.create(this);
  }
}

type OpenDialogParams = {
  makeDialog: ({}: { closeDialog: () => void; scene: Scene }) => void;
  scene: Scene;
};

export const openDialogMenu = (p: OpenDialogParams) => {
  const create = (scene: Scene) => {
    const pausedScenes = compact(
      scene.scene.manager.getScenes().map((s) => {
        if (s.scene.key === masterSceneKey || s === scene) return;
        s.scene.pause();
        return s.scene.key;
      }),
    );
    p.makeDialog({
      scene,
      closeDialog: () => {
        pausedScenes.forEach((sKey) => scene.scene.resume(sKey));
        scene.scene.remove();
      },
    });
  };
  const key = uniqueId("dialog-");
  p.scene.scene.add(
    key,
    new DialogScene({
      key,
      create,
    }),
    true,
  );
};
