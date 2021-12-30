import * as Phaser from "phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { gameHeight, gameWidth, menuSceneKey } from "../common/constants";
import { ManipulableObject } from "/src/helpers/phaser";
import { fadeDuration, menuZoneSize } from "/src/scenes/menu/menu-scene-def";
import { globalEvents } from "/src/scenes/common/global-events";
import { endEventAnim } from "/src/scenes/menu/end-event-anim";

const buttonSize = 60;

type Side = "left" | "right";
const mirrorX = (side: Side, x: number) =>
  side === "left" ? x : gameWidth - x;

export class MenuScene extends Phaser.Scene {
  private nbButtons = { left: 0, right: 0 };

  constructor() {
    super({
      key: menuSceneKey,
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

  create({
    currentScene,
    parentScene,
  }: {
    currentScene: Phaser.Scene;
    parentScene: Phaser.Scene;
  }) {
    if (parentScene) {
      const goBackButton = this.addButton(
        ({ x, y, size }) =>
          this.add.star(x, y, 5, size / 4, size / 2, 0xf5a742, 0.5),
        { side: "left" },
      );
      goBackButton.on("pointerdown", () => globalEvents.goToHub.emit({})(this));
    } else {
      this.cameras.main.fadeIn(fadeDuration);
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
    globalEvents.subSceneEntered.emit({})(this);
    Flow.runScene(
      this,
      Flow.observe(globalEvents.endEventAnim.subject, endEventAnim),
    );
  }
}
