import Vector2 = Phaser.Math.Vector2;
import Color = Phaser.Display.Color;
import {
  createSpriteAt,
  vecToXY,
  createImageAt,
  placeAt,
  addPhysicsFromSprite,
  ManipulableObject,
  getObjectPosition,
  getPointerPosInMainCam,
} from "/src/helpers/phaser";
import {
  subWordGameBeginEvent,
  gameWidth,
  gameHeight,
} from "../common/constants";
import * as Flow from "/src/helpers/phaser-flow";
import { annotate } from "/src/helpers/typing";
import {
  defineGoClass,
  declareGoInstance,
  customEvent,
  spriteClassKind,
  commonGoEvents,
} from "/src/helpers/component";
import { combineContext, getProp } from "/src/helpers/functional";
import { combineLatest, fromEvent } from "rxjs";
import { map } from "rxjs/operators";
import * as Def from "./def";
import _, { flatMap, mapValues } from "lodash";
import { followPosition, followRotation } from "/src/helpers/animate/composite";
import { Maybe } from "purify-ts";
import { makeStatesFlow } from "/src/helpers/animate/flow-state";
import { bodyPartsConfig } from "./def";

export const createCentralCreature: Flow.PhaserNode = Flow.lazy((scene) => {
  const body = scene.add.rope(
    gameWidth / 2,
    gameHeight / 2,
    "central",
    "central",
  );

  type Spasm = { pos: number; t: number };
  const spasms: Array<Spasm> = [];
  const bodyDiameter = 225;
  const circle = new Phaser.Curves.Ellipse(0, 0, bodyDiameter);
  const points = circle.getPoints(0, 5).concat([circle.getStartPoint()]);
  let tensionForce: number[] = [];
  const getBodyPointPos = (i: number) => i / points.length;
  const getPointTensionMove = (point: Vector2, i: number) =>
    point.clone().add(
      circle
        .getTangent(getBodyPointPos(i))
        .normalizeRightHand()
        .scale((tensionForce[i] * 45 * point.length()) / bodyDiameter),
    );
  const getPointTensionMoveGlobal = (point: Vector2) => {
    const localPoint = point.clone().subtract(getObjectPosition(body));
    const i = Math.floor((localPoint.angle() / (Math.PI * 2)) * points.length);
    return getPointTensionMove(localPoint, i).add(getObjectPosition(body));
  };

  const updateBodyPoints = () => {
    const getForce = (spasm: Spasm) => {
      const t = scene.time.now - spasm.t;
      return {
        t,
        power: (i: number) => {
          const pos = getBodyPointPos(i);
          const distToPos = Math.abs(pos - spasm.pos);
          const dist = Math.min(distToPos, 1 - distToPos);
          return Math.exp(-((t / 500) ** 2)) * Math.exp(-((dist / 0.1) ** 2));
        },
      };
    };
    const colorForce = spasms.reduce(
      (acc, spasm) => {
        const force = getForce(spasm);
        return _.range(0, points.length).map((i) => acc[i] + force.power(i));
      },
      points.map(() => 0),
    );
    tensionForce = spasms.reduce(
      (acc, spasm) => {
        const force = getForce(spasm);
        return _.range(0, points.length).map(
          (i) => acc[i] + Math.cos(force.t / 70) * force.power(i),
        );
      },
      points.map(() => 0),
    );

    body.setPoints(points.map(getPointTensionMove));
    body.setColors(
      colorForce.map(
        (force) =>
          Color.ObjectToColor(
            Color.Interpolate.RGBWithRGB(63, 255, 0, 255, 38, 200, 1, force),
          ).color,
      ),
    );
    body.setDirty();
  };

  const makeLegPos = (dir: number) =>
    _.range(Def.bodyPartsConfig.leg.total / 2).map((i) =>
      new Vector2().setToPolar(
        -Math.PI / 2 + dir * (Math.PI / 5 + (i * Math.PI) / 4),
        bodyDiameter,
      ),
    );

  const availableSlots: { [key in Def.BodyPart]: Vector2[] } = {
    eye: _.range(Def.bodyPartsConfig.eye.total).map((i) =>
      new Vector2().setToPolar(
        -Math.PI / 2 + ((i % 2 === 0 ? i + 1 : -i) * Math.PI) / 14,
        bodyDiameter - 58,
      ),
    ),
    mouth: _.range(Def.bodyPartsConfig.mouth.total).map((i) =>
      new Vector2().setToPolar(
        ((Math.PI * 2) / 3) * i + Math.PI / 2,
        bodyDiameter,
      ),
    ),
    algae: _.range(Def.bodyPartsConfig.algae.total).map((i) =>
      new Vector2().setToPolar(
        Math.PI / 2 + ((i % 2 === 0 ? i + 1 : -i) * Math.PI) / 10,
        bodyDiameter / 2,
      ),
    ),
    leg: flatMap([-1, 1], makeLegPos),
  };

  const catchElement = (
    pickEvent: Def.ElemReadyToPickParams,
  ): Flow.PhaserNode =>
    Flow.lazy(() => {
      const pickableInst = declareGoInstance(
        Def.movableElementClass,
        pickEvent.key,
      );
      const bodyPartSlots = availableSlots[pickEvent.bodyPart];
      const rootPos =
        pickEvent.requiredSlot !== undefined
          ? bodyPartSlots[pickEvent.requiredSlot]
          : bodyPartSlots.shift();
      if (!rootPos) return Flow.noop;
      rootPos.add(getObjectPosition(body));
      const tentacle = scene.add
        .rope(rootPos.x, rootPos.y, "central", "tentacle")
        .setDepth(Def.depths.tentacle);
      const currentPos = rootPos.clone();

      const tentacleState = Flow.makeSceneStates();

      const getBodyMove = () => getPointTensionMoveGlobal(rootPos);

      const bodyTypeConfig = bodyPartsConfig[pickEvent.bodyPart];

      const afterRetractTentacle: Flow.PhaserNode = Flow.lazy(() => {
        if (!bodyTypeConfig.needsRotation) return Flow.noop;
        const destRot = Phaser.Math.Angle.Wrap(
          Phaser.Math.Angle.BetweenPoints(getObjectPosition(body), rootPos) +
            bodyTypeConfig.rotationOffset,
        );
        return Flow.tween({
          targets: pickableInst.getObj(scene),
          props: {
            rotation: destRot,
          },
        });
      });

      const retractTentacle: Flow.PhaserNode = Flow.lazy(() => {
        return Flow.parallel(
          Flow.handlePostUpdate({
            handler: () => () => {
              const diff = updateTentaclePos(rootPos);
              if (diff < 2) {
                tentacle.destroy();
                pickableInst.data.move.setValue({
                  pos: () => getBodyMove(),
                  rotation: () => 0,
                })(scene);
                tentacleState.next(afterRetractTentacle);
              }
            },
          }),
        );
      });

      const updateTentaclePos = (targetPos: Vector2) => {
        const diff = targetPos.distance(currentPos);
        const speed = targetPos
          .clone()
          .subtract(currentPos)
          .normalize()
          .scale(Phaser.Math.SmoothStep(diff, 50, 300) * 8 + 1);
        currentPos.add(speed);
        const endPoint = currentPos.clone().subtract(rootPos);
        const path = new Phaser.Curves.Line(
          getBodyMove().subtract(rootPos),
          endPoint,
        );
        const points = path.getPoints(undefined, 3).map((point) => {
          const dist = point.length();
          const delta = Math.cos(dist / 30 - scene.time.now / 650);
          return point.clone().add(
            path
              .getTangent()
              .normalizeLeftHand()
              .scale(
                delta *
                  Phaser.Math.Interpolation.SmoothStep(
                    Math.min(dist, endPoint.distance(point)) / 50,
                    0,
                    25,
                  ),
              ),
          );
        });
        tentacle.setPoints(points);
        tentacle.setDirty();
        return diff;
      };

      return tentacleState.start(
        Flow.handlePostUpdate({
          handler: () => () => {
            const diff = updateTentaclePos(
              getObjectPosition(pickableInst.getObj(scene)),
            );
            if (diff < 8) {
              pickableInst.data.move.setValue({
                pos: () => currentPos,
                rotation: () => 0,
              })(scene);
              tentacleState.next(retractTentacle);
            }
          },
        }),
      );
    });

  return Flow.parallel(
    Flow.repeatSequence(
      Flow.waitTimer(650),
      Flow.call(() => {
        spasms.push({
          pos: Phaser.Math.Wrap(
            Maybe.fromNullable(_.last(spasms))
              .map(getProp("pos"))
              .orDefault(0) + Phaser.Math.RND.realInRange(0.2, 0.5),
            0,
            1,
          ),
          t: scene.time.now,
        });
        if (spasms.length > 4) {
          spasms.shift();
        }
      }),
    ),
    Flow.observe(Def.sceneClass.events.elemReadyToPick.subject, catchElement),
    Flow.handlePostUpdate({ handler: () => updateBodyPoints }),
  );
});
