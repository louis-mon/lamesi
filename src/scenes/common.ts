import { Scene } from "phaser";
import { ManipulableObject } from "../helpers/phaser";
import { gameHeight } from "./hub/hub";

const metaZoneSize = 30;

export const debugObjectPos = (scene: Scene, obj: ManipulableObject) => {
  const text = scene.add.text(0, 0, "");
  text.depth = 1000;
  scene.events.on("update", () => {
    const { x, y } = obj.getBottomCenter(undefined, true);
    text.setPosition(x, y);
    text.text = `${obj.x}, ${obj.y}`;
  });
};

export const gameZoneHelpers = {
  createZone: (scene: Scene) => {
    const menuButton = scene.add.star(15, 15, 5, 5, 10, 0xf5a742, 0.5);
    menuButton.setInteractive();
    menuButton.on("pointerdown", () => scene.scene.start("hub"));
    scene.add.line(metaZoneSize, gameHeight / 2, 0, 0, 0, gameHeight, 0xf5a742);
  },
  ensureWithin: (go: ManipulableObject) => {
    const diff = go.getLeftCenter().x - metaZoneSize;
    if (diff < 0) go.x -= diff;
  }
};
