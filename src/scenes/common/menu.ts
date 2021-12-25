import * as Phaser from "phaser";
import { gameHeight, gameWidth, subWordGameBeginEvent } from "./constants";
import { ManipulableObject } from "/src/helpers/phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { makeSceneSpawner } from "/src/helpers/phaser-flow";
import { fromEvent } from "rxjs";
import { menuSceneDef, menuZoneSize } from "/src/scenes/common/menu-scene-def";

const buttonSize = 60;

type Side = "left" | "right";
const mirrorX = (side: Side, x: number) =>
  side === "left" ? x : gameWidth - x;

export class MenuScene extends Phaser.Scene {
  private nbButtons = { left: 0, right: 0 };

  constructor() {
    super({
      key: "menu",
    });
  }

  createUiZone(side: "left" | "right") {
    this.add.rectangle(
      mirrorX(side, menuZoneSize / 2),
      gameHeight / 2,
      menuZoneSize,
      gameHeight,
      0x7f7f7f,
      0.3,
    );
  }

  addButton<O extends ManipulableObject>(
    f: (p: { x: number; y: number; size: number }) => O,
    options: { side: "left" | "right" },
  ) {
    const nbButtons = this.nbButtons[options.side];
    if (nbButtons === 0) this.createUiZone(options.side);
    const obj = f({
      x: mirrorX(options.side, menuZoneSize / 2),
      y: menuZoneSize * (1 + nbButtons * 1.5),
      size: buttonSize,
    });
    obj.setInteractive();
    ++this.nbButtons[options.side];
    return obj;
  }

  addRightButton<O extends ManipulableObject>(
    f: (p: { x: number; y: number; size: number }) => O,
  ) {
    return this.addButton(f, { side: "right" });
  }

  create(p: { currentScene: Phaser.Scene; parentScene: Phaser.Scene }) {
    const spawner = makeSceneSpawner();

    const goToHub: Flow.PhaserNode = Flow.lazy(() => {
      const manager = this.scene.manager;
      const scenes = manager.getScenes();
      const destroyEvents = scenes.map((scene) => {
        return Flow.wait(fromEvent(scene.events, "destroy"));
      });
      const destroyScene = () => {
        scenes.forEach((scene) => scene.scene.remove());
      };
      return Flow.sequence(
        Flow.parallel(...destroyEvents, Flow.call(destroyScene)),
        Flow.call(() => manager.start(p.parentScene.scene.key)),
      );
    });

    if (p.parentScene) {
      const goBackButton = this.addButton(
        ({ x, y, size }) =>
          this.add.star(x, y, 5, size / 4, size / 2, 0xf5a742, 0.5),
        { side: "left" },
      );
      goBackButton.on("pointerdown", () => spawner.spawn(goToHub));
    }
    this.addButton(
      ({ x, y, size }) =>
        this.add
          .rectangle(x, y, size, size, 0xffffff, 0.5)
          .setStrokeStyle(2)
          .on("pointerdown", () => {
            this.scale.toggleFullscreen();
          }),
      { side: "left" },
    );
    p.currentScene.events.emit(subWordGameBeginEvent);
    Flow.run(
      this,
      Flow.parallel(
        spawner.flow,
        Flow.observe(menuSceneDef.events.goToHub.subject, () => goToHub),
      ),
    );
  }
}
