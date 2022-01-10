import * as Flow from "/src/helpers/phaser-flow";
import { GlobalDataKey } from "/src/scenes/common/global-data";
import { Scene } from "phaser";
import { getEventDef } from "/src/scenes/common/events-def";
import { moveTo } from "/src/helpers/animate/move";
import Vector2 = Phaser.Math.Vector2;
import { placeAt } from "/src/helpers/phaser";

export const createKeyItem = (key: GlobalDataKey, scene: Scene) => {
  const evDef = getEventDef(key);
  const obj = scene.add.image(0, -50, "items", evDef.keyItem);

  const disappearAnim = () =>
    Flow.sequence(
      Flow.tween({
        targets: obj,
        props: { alpha: 0 },
        duration: 400,
      }),
      Flow.call(() => obj.destroy()),
    );

  return {
    obj,
    disappearAnim,
    downAnim: ({
      dest,
      teleport,
    }: {
      dest: Vector2;
      teleport?: boolean;
    }): Flow.PhaserNode =>
      teleport
        ? Flow.call(() => placeAt(obj, dest))
        : Flow.sequence(
            Flow.call(() => placeAt(obj, new Vector2(dest.x, -50))),
            moveTo({
              dest,
              speed: 0.3,
              target: obj,
            }),
          ),
  };
};
