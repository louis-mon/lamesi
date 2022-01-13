import * as Flow from "/src/helpers/phaser-flow";
import { GlobalDataKey } from "/src/scenes/common/global-data";
import { Scene } from "phaser";
import { getEventDef } from "/src/scenes/common/events-def";
import Vector2 = Phaser.Math.Vector2;
import { placeAt } from "/src/helpers/phaser";

export const createKeyItem = (key: GlobalDataKey, scene: Scene) => {
  const evDef = getEventDef(key);
  const obj = scene.add.image(0, 0, "items", evDef.keyItem).setVisible(false);

  const alphaDuration = 1400;
  const disappearAnim = () =>
    Flow.sequence(
      Flow.tween({
        targets: obj,
        props: { alpha: 0 },
        duration: alphaDuration,
      }),
      Flow.call(() => obj.destroy()),
    );

  const appearAt = (dest: Vector2): Flow.PhaserNode =>
    Flow.lazy(() => {
      obj.setAlpha(0).setVisible(true);
      placeAt(obj, dest);
      return Flow.tween({
        targets: obj,
        props: { alpha: 1 },
        duration: alphaDuration,
      });
    });

  const moveTo = (dest: Vector2): Flow.PhaserNode =>
    Flow.moveTo({
      dest,
      speed: 0.3,
      target: obj,
    });

  return {
    obj,
    disappearAnim,
    appearAt,
    moveTo,
    downAnim: (dest: Vector2): Flow.PhaserNode =>
      Flow.sequence(
        Flow.call(() =>
          placeAt(obj, new Vector2(dest.x, -obj.height)).setVisible(true),
        ),
        moveTo(dest),
      ),
  };
};
