import * as Flow from "/src/helpers/phaser-flow";
import { LightSceneGoalDef } from "/src/scenes/lights/lights-def";
import { getEventDef } from "/src/scenes/common/events-def";
import { globalEvents } from "/src/scenes/common/global-events";
import { createImageAt, getObjectPosition } from "/src/helpers/phaser";
import GameObject = Phaser.GameObjects.GameObject;
import Transform = Phaser.GameObjects.Components.Transform;

export const solveLight = ({
  target,
  goalDef,
}: {
  target: GameObject & Transform;
  goalDef: LightSceneGoalDef;
}): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const keyItem = createImageAt(
      scene,
      getObjectPosition(target),
      "items",
      getEventDef(goalDef.eventRequired).keyItem,
    );
    scene.children.moveDown(keyItem);
    return Flow.sequence(
      Flow.tween({
        targets: target,
        props: { scale: 2, alpha: 0 },
        duration: 1400,
      }),
      Flow.call(
        globalEvents.endEventAnim.emit({
          dataSolved: goalDef.eventRequired,
        }),
      ),
    );
  });
