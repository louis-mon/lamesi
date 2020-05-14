import * as Phaser from "phaser";
import { gameHeight } from "./common";
import { ManipulableObject } from "../helpers/phaser";

export const menuZoneSize = 75;
const buttonSize = 60;

export const menuHelpers = {
  ensureOutsideMenu: (go: ManipulableObject) => {
    const diff = go.getLeftCenter().x - menuZoneSize;
    if (diff < 0) go.x -= diff;
  },
};

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({
      key: "menu",
    });
  }

  create(p: { currentScene: string }) {
    this.add
      .rectangle(0, 0, menuZoneSize, gameHeight, 0x7f7f7f, 0.3)
      .setOrigin(0, 0);
    const menuButton = this.add.star(
      menuZoneSize / 2,
      menuZoneSize,
      5,
      buttonSize / 4,
      buttonSize / 2,
      0xf5a742,
      0.5,
    );
    menuButton.setInteractive();
    menuButton.on("pointerdown", () => {
      const manager = this.scene.manager;
      [p.currentScene, this.scene.key].map((key) => {
        const scene = manager.getScene(key);
        scene.scene.remove();
      });
      manager.start("hub");
    });
    this.add
      .rectangle(
        menuZoneSize / 2,
        menuZoneSize * 2.5,
        buttonSize,
        buttonSize,
        0xffffff,
        0.5,
      )
      .setStrokeStyle(2)
      .setInteractive()
      .on("pointerdown", () => {
        this.scale.toggleFullscreen();
      });
  }
}
