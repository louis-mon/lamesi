import { Scene } from "phaser";
import { ManipulableObject } from "/src/helpers/phaser";

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
