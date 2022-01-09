import * as Phaser from "phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { gameHeight, gameWidth, menuSceneKey } from "../common/constants";
import { ManipulableObject } from "/src/helpers/phaser";
import { fadeDuration, menuZoneSize } from "/src/scenes/menu/menu-scene-def";
import { globalEvents } from "/src/scenes/common/global-events";
import { endEventAnim } from "/src/scenes/menu/end-event-anim";
import { newEventAnim } from "/src/scenes/menu/new-event-anim";
import { openGoBackMenu } from "/src/scenes/menu/go-back-menu";

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

  create({ inSubScene }: { inSubScene: boolean }) {
    if (inSubScene) {
      const goBackButton = this.addButton(
        ({ x, y, size }) => this.add.image(x, y, "items", "menu-back"),
        { side: "left" },
      );
      goBackButton.on("pointerdown", () => openGoBackMenu(this));
    }
    this.addButton(
      ({ x, y, size }) =>
        this.add
          .image(x, y, "items", "menu-fullscreen")
          .on("pointerdown", () => {
            this.scale.toggleFullscreen();
          }),
      { side: "left" },
    );
    globalEvents.subSceneEntered.emit({})(this);
    Flow.runScene(
      this,
      Flow.parallel(
        Flow.observe(globalEvents.endEventAnim.subject, endEventAnim),
        inSubScene ? Flow.noop : newEventAnim,
      ),
    );
  }
}
