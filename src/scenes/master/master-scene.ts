import * as Flow from "/src/helpers/phaser-flow";
import { fromEvent } from "rxjs";
import { globalEvents } from "/src/scenes/common/global-events";
import { HubScene } from "/src/scenes/hub/hub";
import {
  hubSceneKey,
  masterSceneKey,
  menuSceneKey,
} from "/src/scenes/common/constants";
import { fadeDuration } from "/src/scenes/menu/menu-scene-def";
import { cheatCodeAction } from "/src/scenes/master/cheat-codes";

export class MasterScene extends Phaser.Scene {
  constructor() {
    super({
      key: masterSceneKey,
      loader: {
        path: "assets/common",
      },
    });
  }

  preload() {
    this.load.atlas("items");
  }

  create() {
    const goToHub: Flow.PhaserNode = Flow.lazy(() => {
      const manager = this.scene.manager;
      const scenes = manager.getScenes().filter((scene) => scene !== this);
      const destroyEvents = scenes.map((scene) => {
        return Flow.wait(fromEvent(scene.events, "destroy"));
      });
      const destroyScene = () => {
        scenes.forEach((scene) => scene.scene.remove());
      };
      const camera = manager.getScene(menuSceneKey).cameras.main;
      camera.fade(fadeDuration);
      return Flow.sequence(
        Flow.wait(
          fromEvent(camera, Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE),
        ),
        Flow.parallel(...destroyEvents, Flow.call(destroyScene)),
        Flow.call(() => manager.start("hub")),
      );
    });
    Flow.run(
      this,
      Flow.parallel(
        Flow.observe(globalEvents.goToHub.subject, () => goToHub),
        cheatCodeAction,
      ),
    );
    this.scene.add(hubSceneKey, new HubScene(), false);
    this.scene.run(hubSceneKey)
  }
}
