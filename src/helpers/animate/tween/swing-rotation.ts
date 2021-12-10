import * as Flow from "/src/helpers/phaser-flow";
import Phaser from "phaser";

export const swingRotation = ({
  duration,
  ampl,
  target,
}: {
  duration: number;
  ampl: number;
  target: { rotation: number };
}): Flow.PhaserNode =>
  Flow.lazy(() => {
    const baseRot = target.rotation;
    return Flow.sequence(
      Flow.tween(() => ({
        targets: target,
        props: { rotation: baseRot - ampl / 2 },
        ease: Phaser.Math.Easing.Sine.Out,
        duration,
      })),
      Flow.tween({
        targets: target,
        props: { rotation: baseRot },
        ease: Phaser.Math.Easing.Sine.In,
        duration,
      }),
      Flow.tween({
        targets: target,
        props: { rotation: baseRot + ampl / 2 },
        ease: Phaser.Math.Easing.Sine.Out,
        duration,
      }),
      Flow.tween({
        targets: target,
        props: { rotation: baseRot },
        ease: Phaser.Math.Easing.Sine.In,
        duration,
      }),
    );
  });
