import * as Flow from "/src/helpers/phaser-flow";
import {
  goalHiddenObjectPlane,
  LightSceneGoalDef,
} from "/src/scenes/lights/lights-def";
import { globalEvents } from "/src/scenes/common/global-events";
import { getObjectPosition, placeAt } from "/src/helpers/phaser";
import GameObject = Phaser.GameObjects.GameObject;
import Transform = Phaser.GameObjects.Components.Transform;
import { createKeyItem } from "/src/scenes/common/key-item";

export const solveLight = ({
  target,
  goalDef,
  covers,
}: {
  target: GameObject & Transform;
  covers: Array<GameObject & Transform>;
  goalDef: LightSceneGoalDef;
}): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    scene.input.enabled = false;
    const { obj } = createKeyItem(goalDef.eventRequired, scene);
    placeAt(obj.setDepth(goalHiddenObjectPlane), getObjectPosition(target));
    return Flow.sequence(
      Flow.tween({
        targets: target,
        props: { scale: 2, alpha: 0 },
        duration: 1400,
      }),
      Flow.tween({
        targets: covers,
        props: { alpha: 0 },
        duration: 1100,
      }),
      Flow.waitTimer(6000),
      Flow.call(
        globalEvents.endEventAnim.emit({
          dataSolved: goalDef.eventRequired,
        }),
      ),
    );
  });
