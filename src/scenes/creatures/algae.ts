import Phaser from "phaser";
import Vector2 = Phaser.Math.Vector2;

import * as Flow from "/src/helpers/phaser-flow";
import { declareGoInstance } from "/src/helpers/component";
import * as Def from "./def";
import _ from "lodash";
import { Maybe } from "purify-ts";
import { followPosition } from "/src/helpers/animate/composite";

const swingRotation = ({
  duration,
  ampl,
  target,
}: {
  duration: number;
  ampl: number;
  target: { angle: number };
}): Flow.PhaserNode =>
  Flow.repeatSequence(
    Flow.tween({
      targets: target,
      props: { angle: -ampl / 2 },
      ease: Phaser.Math.Easing.Sine.Out,
      duration,
    }),
    Flow.tween({
      targets: target,
      props: { angle: 0 },
      ease: Phaser.Math.Easing.Sine.In,
      duration,
    }),
    Flow.tween({
      targets: target,
      props: { angle: ampl / 2 },
      ease: Phaser.Math.Easing.Sine.Out,
      duration,
    }),
    Flow.tween({
      targets: target,
      props: { angle: 0 },
      ease: Phaser.Math.Easing.Sine.In,
      duration,
    }),
  );

export const createAlgae = ({
  pos,
  angle,
}: {
  pos: Vector2;
  angle: number;
}) => {
  const instance = declareGoInstance(Def.movableElementClass, null);
  const mainFlow: Flow.PhaserNode = Flow.lazy((scene) => {
    const root = instance
      .create(scene.add.container())
      .setScale(0.3)
      .setDepth(Def.depths.algae)
      .setAngle(angle);

    instance.data.move.setValue({
      pos: () => pos,
      rotation: () => 0,
    })(scene);

    const growAlgae = ({
      parent,
      depth,
      offset,
    }: {
      parent: Phaser.GameObjects.Container;
      depth: number;
      offset: number;
    }): Flow.PhaserNode =>
      Flow.lazy(() => {
        if (depth > 6) return Flow.noop;
        const ampl = 30 / Math.pow(1.1, depth);
        const subAlgae = scene.add
          .image(0, 0, "rocks", "algae")
          .setOrigin(0, 0.5)
          .setScale(0);
        const subContainer = scene.add.container(offset, 0).setScale(1.2);
        parent.addAt(subContainer, 0);
        subContainer.add(subAlgae);

        return Flow.sequence(
          Flow.tween({
            targets: subAlgae,
            props: { scale: 1 },
            duration: 350,
          }),
          Flow.parallel(
            growAlgae({
              parent: subContainer,
              depth: depth + 1,
              offset: subAlgae.width - 10,
            }),
            Flow.repeatSequence(
              Flow.tween({
                targets: subAlgae,
                props: { scaleY: 0.72 },
                duration: 280,
                repeat: 1,
                yoyo: true,
              }),
              Flow.waitTimer(820),
            ),
            swingRotation({ duration: 2300, ampl, target: subContainer }),
          ),
        );
      });

    return Flow.parallel(
      followPosition({
        getPos: () => instance.data.move.value(scene).pos(),
        target: () => root,
      }),
      growAlgae({ parent: root, depth: 0, offset: 0 }),
    );
  });
  return {
    instance,
    flow: mainFlow,
  };
};

export type AlgaeController = ReturnType<typeof createAlgae>;
