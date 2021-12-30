import * as Flow from "/src/helpers/phaser-flow";
import { declareGoInstance } from "/src/helpers/component";
import * as Def from "/src/scenes/creatures/def";
import { getObjectPosition, placeAt } from "/src/helpers/phaser";
import _ from "lodash";
import { followPosition } from "/src/helpers/animate/composite";
import { CreatureMoveCommand } from "/src/scenes/creatures/def";
import { potSceneClass } from "/src/scenes/creatures/pot/pot-def";

export const createMandibles = (
  moveCommand: CreatureMoveCommand,
): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const mandibleInst = declareGoInstance(Def.movableElementClass, null);
    const mandibleRoot = mandibleInst.create(
      placeAt(
        scene.add
          .container()
          .setDepth(Def.depths.potMandible)
          .setRotation(moveCommand.rotation()),
        moveCommand.pos(),
      ),
    );

    mandibleInst.data.move.setValue(moveCommand)(scene);

    const singleMandible = (flip: boolean) => {
      const mandible = scene.add
        .image(0, 0, "pot", "mandible")
        .setScale(0)
        .setFlipX(flip)
        .setOrigin(1, 1);
      mandibleRoot.add(mandible);
      return Flow.sequence(
        Flow.tween({
          targets: mandible,
          props: {
            scale: 1,
          },
          duration: 740,
        }),
        Flow.observe(potSceneClass.events.syncMandibleClaw.subject, () =>
          Flow.sequence(
            ..._.range(2).map(() =>
              Flow.tween({
                targets: mandible,
                props: {
                  angle: -30 * (flip ? -1 : 1),
                },
                duration: 340,
                yoyo: true,
              }),
            ),
          ),
        ),
      );
    };

    return Flow.parallel(
      followPosition({
        getPos: () => mandibleInst.data.move.value(scene).pos(),
        target: () => mandibleRoot,
      }),
      ...[true, false].map(singleMandible),
      Flow.sequence(
        Flow.wait(potSceneClass.events.pickAllMandibles.subject),
        Flow.waitTimer(4000),
        Flow.call(
          Def.sceneClass.events.elemReadyToPick.emit({
            key: mandibleInst.key,
            bodyPart: "mouth",
          }),
        ),
      ),
    );
  });
