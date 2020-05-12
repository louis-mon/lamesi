import { Scene } from "phaser";
import { ManipulableObject } from "../helpers/phaser";

export const gameWidth = 1920;
export const gameHeight = 1080;
export const gameRatio = gameHeight / gameWidth;

export const menuZoneSize = 75;
const buttonSize = 60;

export const debugObjectPos = (scene: Scene, obj: ManipulableObject) => {
  const text = scene.add.text(0, 0, "");
  text.depth = 1000;
  scene.events.on("update", () => {
    const { x, y } = obj.getBottomCenter(undefined, true);
    text.setPosition(x, y);
    text.text = `${Math.round(obj.x)}, ${Math.round(obj.y)}, ${Math.round(
      obj.displayWidth,
    )}, ${Math.round(obj.displayHeight)}`;
  });
};

export const gameZoneHelpers = {
  createZone: (scene: Scene) => {
    scene.add
      .rectangle(0, 0, menuZoneSize, gameHeight, 0x7f7f7f, 0.3)
      .setOrigin(0, 0);
    const menuButton = scene.add.star(
      menuZoneSize / 2,
      menuZoneSize,
      5,
      buttonSize / 4,
      buttonSize / 2,
      0xf5a742,
      0.5,
    );
    menuButton.setInteractive();
    menuButton.on("pointerdown", () => scene.scene.start("hub"));
    scene.add
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
        scene.scale.toggleFullscreen();
      });
  },
  ensureWithin: (go: ManipulableObject) => {
    const diff = go.getLeftCenter().x - menuZoneSize;
    if (diff < 0) go.x -= diff;
  },
};
