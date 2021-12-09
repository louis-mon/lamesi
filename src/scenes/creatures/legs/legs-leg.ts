import Phaser from "phaser";
import Vector2 = Phaser.Math.Vector2;

import * as Flow from "/src/helpers/phaser-flow";
import _ from "lodash";
import { createImageAt, getObjectPosition, placeAt } from "/src/helpers/phaser";
import { Subject } from "rxjs";
import * as Def from "../def";
import { defineGoImage, defineGoObject } from "/src/helpers/component";

export const legsLegClass = defineGoObject({
  events: {},
  data: {},
});

export type LegFlowParams = {
  startPos: Vector2;
  startAngle: number;
  flip?: boolean;
};
export const legFlow = ({
  startPos,
  startAngle,
  flip,
}: LegFlowParams): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const flows = new Subject<Flow.PhaserNode>();

    const createNode = ({
      fromContainer,
      step,
    }: {
      fromContainer: Phaser.GameObjects.Container | null;
      step: number;
    }): Flow.PhaserNode => {
      const container = placeAt(
        scene.add.container(),
        fromContainer ? new Vector2(37, 0) : startPos,
      )
        .setRotation(fromContainer ? -Math.PI / 11 : startAngle)
        .setScale(fromContainer ? 0.85 : 1);
      if (!fromContainer && flip) container.scaleY = -container.scaleY;
      const branch = createImageAt(
        scene,
        new Vector2(0, 0),
        "legs",
        "leaf-branch",
      )
        .setOrigin(0, 0.5)
        .setScale(0)
        .setDepth(Def.depths.legs.thornBranch);
      const leaf = createImageAt(
        scene,
        new Vector2(46, 18),
        "legs",
        "leaf-hair",
      )
        .setOrigin(0, 0.5)
        .setRotation(Math.PI / 3)
        .setScale(0)
        .setDepth(Def.depths.legs.thornLeaf);
      container.add([branch, leaf]);
      fromContainer?.add(container);

      return Flow.call(() =>
        flows.next(
          Flow.sequence(
            Flow.tween({
              targets: branch,
              props: { scale: 1 },
              duration: 500,
              ease: Phaser.Math.Easing.Sine.Out,
            }),
            step >= 8
              ? Flow.noop
              : createNode({ fromContainer: container, step: step + 1 }),
            Flow.tween({
              targets: leaf,
              props: { scale: 0.6 },
              duration: 700,
              ease: Phaser.Math.Easing.Sine.InOut,
            }),
          ),
        ),
      );
    };

    return Flow.parallel(
      Flow.observe(flows),
      createNode({ fromContainer: null, step: 1 }),
    );
  });
