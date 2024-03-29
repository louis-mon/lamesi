import * as Flow from "/src/helpers/phaser-flow";
import { GlobalDataKey } from "/src/scenes/common/global-data";
import { Scene } from "phaser";
import { getEventDef } from "/src/scenes/common/events-def";
import Vector2 = Phaser.Math.Vector2;
import { placeAt } from "/src/helpers/phaser";

export const createKeyItem = (key: GlobalDataKey, scene: Scene) => {
  const evDef = getEventDef(key);
  const obj = evDef
    .createItem({ pos: new Vector2(0, 0), scene })
    .setVisible(false);

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
      speed: 300,
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
