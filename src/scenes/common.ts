import { Scene } from "phaser";
import { ManipulableObject } from "../helpers/phaser";

export const gameWidth = 1920;
export const gameHeight = 1080;
export const gameRatio = gameHeight / gameWidth;

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

export const subWordGameBeginEvent = "subWordGameBeginEvent";
