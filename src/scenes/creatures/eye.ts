import * as Flow from "/src/helpers/phaser-flow";
import * as Def from "/src/scenes/creatures/def";
import { declareGoInstance } from "/src/helpers/component";
import { followPosition, followRotation } from "/src/helpers/animate/composite";
import { getObjectPosition, getPointerPosInMainCam } from "/src/helpers/phaser";

export const createEye = (initial: Def.CreatureMoveCommand): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const eyelidInst = declareGoInstance(Def.movableElementClass, null);
    const eyeblank = eyelidInst.create(
      scene.add
        .sprite(0, 0, "tree", "eye-blank")
        .setDepth(Def.depths.eye)
        .setScale(0),
    );

    eyelidInst.data.move.setValue(initial)(scene);

    const eyelid = scene.add
      .sprite(0, 0, "tree", "eyelid-1")
      .setScale(0)
      .setDepth(Def.depths.eye);

    const eyeAnimKey = "blinkEye";
    const eyeAnim = eyelid.anims.create({
      key: eyeAnimKey,
      defaultTextureKey: "tree",
      duration: 150,
      yoyo: true,
      frames: [
        { frame: "eyelid-1" },
        { frame: "eyelid-2" },
        { frame: "eyelid-3" },
      ],
    });

    return Flow.parallel(
      followPosition({
        getPos: () => eyelidInst.data.move.value(scene).pos(),
        target: () => eyelid,
      }),
      followPosition({
        getPos: () => eyelidInst.data.move.value(scene).pos(),
        target: () => eyeblank,
      }),
      followRotation({
        getRotation: () => eyelidInst.data.move.value(scene).rotation(),
        target: () => eyelid,
      }),
      followRotation({
        getRotation: () => {
          return getPointerPosInMainCam(scene)
            .subtract(getObjectPosition(eyeblank))
            .angle();
        },
        target: () => eyeblank,
      }),
      Flow.sequence(
        Flow.tween({
          targets: [eyelid, eyeblank],
          props: { scale: 1, duration: 580 },
        }),
        Flow.waitTimer(3000),
        Flow.call(
          Def.sceneClass.events.elemReadyToPick.emit({
            key: eyelidInst.key,
            bodyPart: "eye",
          }),
        ),
      ),
      Flow.repeatSequence(
        Flow.waitTimer(3000),
        Flow.call(() => eyelid.play(eyeAnimKey)),
        Flow.waitTimer(400),
        Flow.call(() => eyelid.play(eyeAnimKey)),
      ),
    );
  });
