import Phaser from "phaser";
import Vector2 = Phaser.Math.Vector2;

import * as Flow from "/src/helpers/phaser-flow";
import { createImageAt, placeAt } from "/src/helpers/phaser";
import { Subject } from "rxjs";
import * as Def from "../def";
import { declareGoInstance } from "/src/helpers/component";
import { CreateBodyPartParams, movableElementClass, sceneClass } from "../def";
import {
  LegFlowParams,
  legsConfigBySlot,
  legsSwingDuration,
} from "/src/scenes/creatures/legs/legs-defs";
import { followPosition } from "/src/helpers/animate/composite";

export const createLeg = (moveCommand: CreateBodyPartParams): Flow.PhaserNode =>
  legFlowFromConfig({
    startPos: moveCommand.pos(),
    requiredSlot: moveCommand.slot,
    ...legsConfigBySlot[moveCommand.slot],
  });

const legFlowFromConfig = ({
  startPos,
  startAngle,
  flip,
  requiredSlot,
}: LegFlowParams): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const flows = new Subject<Flow.PhaserNode>();
    const inst = declareGoInstance(movableElementClass, null);
    const dir = flip ? -1 : 1;
    const rootContainer = inst
      .create(scene.add.container())
      .setRotation(startAngle);
    inst.data.move.setValue({ pos: () => startPos, rotation: () => 0 })(scene);
    rootContainer.scaleY *= dir;

    const createNode = ({
      fromContainer,
      step,
    }: {
      fromContainer: Phaser.GameObjects.Container;
      step: number;
    }): Flow.PhaserNode => {
      const container = placeAt(
        scene.add.container(),
        step > 1 ? new Vector2(37, 0) : new Vector2(),
      )
        .setRotation(step > 1 ? -Math.PI / 11 : Math.PI / 9)
        .setScale(step > 1 ? 0.85 : 1);
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
      fromContainer.add(container);

      const askToCatch = Flow.sequence(
        Flow.waitTimer(1200),
        Flow.call(
          sceneClass.events.elemReadyToPick.emit({
            key: inst.key,
            bodyPart: "leg",
            requiredSlot,
          }),
        ),
      );

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
              ? askToCatch
              : createNode({ fromContainer: container, step: step + 1 }),
            Flow.tween({
              targets: leaf,
              props: { scale: 0.6 },
              duration: 700,
              ease: Phaser.Math.Easing.Sine.InOut,
            }),
            Flow.parallel(
              Flow.observe(sceneClass.events.syncLegs.subject, () =>
                Flow.sequence(
                  Flow.tween({
                    targets: container,
                    props: {
                      rotation:
                        container.rotation -
                        Math.PI / 18 / Math.pow(1.2, step - 1),
                    },
                    ease: Phaser.Math.Easing.Sine.InOut,
                    duration: legsSwingDuration,
                    yoyo: true,
                  }),
                ),
              ),
            ),
          ),
        ),
      );
    };

    return Flow.parallel(
      followPosition({
        getPos: () => inst.data.move.value(scene).pos(),
        target: () => rootContainer,
      }),
      Flow.observe(flows),
      createNode({ fromContainer: rootContainer, step: 1 }),
    );
  });
