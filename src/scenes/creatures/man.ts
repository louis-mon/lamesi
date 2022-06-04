import * as Flow from "/src/helpers/phaser-flow";
import { swingRotation } from "/src/helpers/animate/tween/swing-rotation";
import { moveTo } from "/src/helpers/animate/move";
import Vector2 = Phaser.Math.Vector2;
import {
  BodyPart,
  bodyPartsConfig,
  sceneClass,
} from "/src/scenes/creatures/def";
import { Scene } from "phaser";
import { isEventSolved } from "/src/scenes/common/events-def";
import { range } from "lodash";
import { gameHeight, gameWidth } from "/src/scenes/common/constants";
import { panCameraTo } from "/src/helpers/animate/tween/camera";

export const manDeskPos = new Vector2(960, 962);

export const setToWaitingState: Flow.PhaserNode = Flow.lazy((scene) => {
  const man = sceneClass.data.manObj.value(scene);
  return Flow.call(() => man.setFlipX(false));
});

export const moveMan: (p: { dest: Vector2 }) => Flow.PhaserNode = ({ dest }) =>
  Flow.lazy((scene) => {
    const manSpeed = 0.2;
    const man = sceneClass.data.manObj.value(scene);
    const dx = dest.x - man.x;
    if (dx !== 0) man.setFlipX(dx > 0);
    return Flow.concurrent(
      Flow.repeat(
        swingRotation({
          duration: 120,
          target: man,
          ampl: Math.PI / 16,
        }),
      ),
      moveTo({
        target: man,
        dest,
        speed: manSpeed,
      }),
    );
  });

type TransformConditionDef = {
  bodyPart: BodyPart;
  frameKey: string;
};

const transformConditions: Array<TransformConditionDef> = [
  { frameKey: "man3", bodyPart: "algae" },
  { frameKey: "man2", bodyPart: "eye" },
];

export const getTargetTransform = (
  scene: Scene,
): TransformConditionDef | undefined => {
  return transformConditions.find((def) =>
    isEventSolved(bodyPartsConfig[def.bodyPart].requiredEvent)(scene),
  );
};

export const transformMan: Flow.PhaserNode = Flow.lazy((scene) => {
  const man = sceneClass.data.manObj.value(scene);

  const targetTransform = getTargetTransform(scene);
  if (!targetTransform) return Flow.noop;

  const zoom = 3;
  const totalFrames = 30;
  const duration = 300;
  const oldFrame = man.frame.name;
  return Flow.sequence(
    Flow.parallel(
      panCameraTo({
        target: new Vector2(gameWidth / 2, gameHeight * (1 - 1 / 2 / zoom)),
        zoom,
      }),
    ),
    ...range(7, totalFrames - 7).map((i) =>
      Flow.sequence(
        Flow.call(() => man.setFrame(oldFrame)),
        Flow.waitTimer((1 - i / totalFrames) * duration),
        Flow.call(() => man.setFrame(targetTransform.frameKey)),
        Flow.waitTimer((i / totalFrames) * duration),
      ),
    ),
  );
});
