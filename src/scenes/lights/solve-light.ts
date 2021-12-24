import * as Flow from "/src/helpers/phaser-flow";
import { LightSceneGoalDef } from "/src/scenes/lights/lights-def";
import { solveEvent } from "/src/scenes/common/progress-dependencies";
import GameObject = Phaser.GameObjects.GameObject;

export const solveLight = ({
  target,
  goalDef,
}: {
  target: GameObject;
  goalDef: LightSceneGoalDef;
}): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    return Flow.sequence(
      Flow.tween({
        targets: target,
        props: { scale: 1.4 },
        repeat: 1,
        yoyo: true,
        duration: 700,
      }),
      Flow.tween({
        targets: target,
        props: { alpha: 0.5 },
      }),
      Flow.call(solveEvent(goalDef.eventRequired)),
    );
  });
