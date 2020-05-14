import * as Phaser from "phaser";
import { gameHeight } from "./common";
import { ManipulableObject } from "../helpers/phaser";

export const menuZoneSize = 75;
const buttonSize = 60;

const getMenuScene = (scene: Phaser.Scene) =>
  scene.scene.get("menu") as MenuScene;

export const menuHelpers = {
  ensureOutsideMenu: (go: ManipulableObject) => {
    const diff = go.getLeftCenter().x - menuZoneSize;
    if (diff < 0) go.x -= diff;
  },
  getMenuScene,
};

export class MenuScene extends Phaser.Scene {
  private nbButtons = 0;

  constructor() {
    super({
      key: "menu",
    });
  }

  addButton<O extends ManipulableObject>(
    f: (p: { x: number; y: number; size: number }) => O,
  ) {
    const obj = f({
      x: menuZoneSize / 2,
      y: menuZoneSize * (1 + this.nbButtons * 1.5),
      size: buttonSize,
    });
    obj.setInteractive();
    ++this.nbButtons;
    return obj;
  }

  create(p: { currentScene: string }) {
    this.add
      .rectangle(0, 0, menuZoneSize, gameHeight, 0x7f7f7f, 0.3)
      .setOrigin(0, 0);
    const goBackButton = this.addButton(({ x, y, size }) =>
      this.add.star(x, y, 5, size / 4, size / 2, 0xf5a742, 0.5),
    );
    goBackButton.on("pointerdown", () => {
      const manager = this.scene.manager;
      [p.currentScene, this.scene.key].map((key) => {
        const scene = manager.getScene(key);
        scene.scene.remove();
      });
      manager.start("hub");
    });
    this.addButton(({ x, y, size }) =>
      this.add
        .rectangle(x, y, size, size, 0xffffff, 0.5)
        .setStrokeStyle(2)
        .on("pointerdown", () => {
          this.scale.toggleFullscreen();
        }),
    );
  }
}
