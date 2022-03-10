import { Scene } from "phaser";
import { ManipulableObject } from "/src/helpers/phaser";

export const debugObjectPos = (scene: Scene, obj: ManipulableObject) => {
  if (process.env.NODE_ENV !== "development") return;
  const text = scene.add.text(0, 0, "");
  text.depth = 1000;
  scene.events.on("update", () => {
    const { x, y } = obj.getBottomCenter(undefined, true);
    text.setPosition(x, y);
    const depth = Math.sqrt(obj.width / obj.displayWidth).toPrecision(2);
    text.text = `${Math.round(obj.x)}, ${Math.round(obj.y)}, ${Math.round(
      obj.displayWidth,
    )}, ${Math.round(obj.displayHeight)}, ${depth}`;
  });
};
