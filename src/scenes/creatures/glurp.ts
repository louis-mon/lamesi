import Vector2 = Phaser.Math.Vector2;
import Color = Phaser.Display.Color;
import { getObjectPosition } from "/src/helpers/phaser";
import { gameWidth, gameHeight } from "../common/constants";
import * as Flow from "/src/helpers/phaser-flow";
import { declareGoInstance } from "/src/helpers/component";
import { getProp } from "/src/helpers/functional";
import * as Def from "./def";
import _, { flatMap, mapValues, values } from "lodash";
import { Maybe } from "purify-ts";
import {
  BodyPart,
  bodyPartsConfig,
  CreateBodyPartParams,
  creatureSceneClass,
} from "./def";
import { isEventSolved } from "/src/scenes/common/events-def";
import { PhaserNode } from "/src/helpers/phaser-flow";
import { createEye } from "/src/scenes/creatures/eye";
import { createAlgae } from "/src/scenes/creatures/algae/algae";
import { createMandibles } from "/src/scenes/creatures/pot/mandibles";
import { createLeg } from "/src/scenes/creatures/legs/legs-leg";
import { solveCreatureEvent } from "/src/scenes/creatures/solve-creature-event";
import { legsSwingDuration } from "/src/scenes/creatures/legs/legs-defs";
import { potSceneClass } from "/src/scenes/creatures/pot/pot-def";
import { toLocalPos } from "/src/helpers/math/transforms";

const moveLegs: Flow.PhaserNode = Flow.repeatSequence(
  Flow.waitTimer(legsSwingDuration * 4),
  Flow.call(creatureSceneClass.events.syncLegs.emit({})),
);

const clawMandibles = Flow.repeatSequence(
  Flow.waitTimer(2200),
  Flow.call(potSceneClass.events.syncMandibleClaw.emit({})),
);

const bodyPartsToFlow: {
  [key in BodyPart]: (p: CreateBodyPartParams) => PhaserNode;
} = {
  eye: createEye,
  algae: (p) => createAlgae(p).flow,
  leg: createLeg,
  mouth: createMandibles,
};

export const createGlurp = (params: {
  pos: Vector2;
  rotation?: number;
}): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const container = scene.add
      .container(params.pos.x, params.pos.y)
      .setRotation(params.rotation ?? 0);
    const body = scene.add.rope(0, 0, "central", "central");
    container.add(body);
    creatureSceneClass.data.glurpObj.setValue(container)(scene);

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
      const i = Math.floor((point.angle() / (Math.PI * 2)) * points.length);
      return getPointTensionMove(point, i).add(getObjectPosition(body));
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

    const filledSlotCount: { [key in Def.BodyPart]: number } = mapValues(
      Def.bodyPartsConfig,
      () => 0,
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

    const getBodyPartMoves = (rootPos: Vector2, bodyType: BodyPart) => {
      const bodyTypeConfig = bodyPartsConfig[bodyType];

      return {
        getRotation: (): Maybe<number> => {
          if (!bodyTypeConfig.needsRotation) return Maybe.empty();
          return Maybe.of(
            Phaser.Math.Angle.Wrap(
              rootPos.angle() + bodyTypeConfig.rotationOffset,
            ),
          );
        },
        getMove: () => getPointTensionMoveGlobal(rootPos),
      };
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
        const partConfig = bodyPartsConfig[pickEvent.bodyPart];
        if (isEventSolved(partConfig.requiredEvent)(scene)) return Flow.noop;

        const rootPos =
          pickEvent.requiredSlot !== undefined
            ? bodyPartSlots[pickEvent.requiredSlot]
            : bodyPartSlots.shift();
        if (!rootPos) return Flow.noop;

        const { getRotation, getMove } = getBodyPartMoves(
          rootPos,
          pickEvent.bodyPart,
        );
        const tentacle = scene.add
          .rope(rootPos.x, rootPos.y, "central", "tentacle")
          .setDepth(Def.depths.tentacle);
        container.add(tentacle);
        const currentPos = rootPos.clone();

        const tentacleState = Flow.makeSceneStates();

        const sendSolveEvent: Flow.PhaserNode = Flow.lazy(() => {
          ++filledSlotCount[pickEvent.bodyPart];
          if (filledSlotCount[pickEvent.bodyPart] < partConfig.total)
            return Flow.noop;

          return solveCreatureEvent(pickEvent.bodyPart);
        });

        const afterRetractTentacle: Flow.PhaserNode = Flow.lazy(() => {
          const finalRotation = getRotation()
            .map((rotation) =>
              Flow.tween({
                targets: pickableInst.getObj(scene),
                props: {
                  rotation,
                },
              }),
            )
            .orDefault(Flow.noop);
          return Flow.sequence(finalRotation, sendSolveEvent);
        });

        const retractTentacle: Flow.PhaserNode = Flow.lazy(() => {
          return Flow.parallel(
            Flow.handlePostUpdate({
              handler: () => () => {
                const diff = updateTentaclePos(rootPos);
                if (diff < 2) {
                  tentacle.destroy();
                  pickableInst.data.move.setValue({
                    pos: getMove,
                    rotation: () => 0,
                    container,
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
            getMove().subtract(rootPos),
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
                toLocalPos(
                  container,
                  getObjectPosition(pickableInst.getObj(scene)),
                ),
              );
              if (diff < 8) {
                pickableInst.data.move.setValue({
                  pos: () => currentPos,
                  rotation: () => 0,
                  container,
                })(scene);
                tentacleState.next(retractTentacle);
              }
            },
          }),
        );
      });

    const spawnBodyPart = (part: BodyPart): Flow.PhaserNode => {
      const slots = availableSlots[part];
      return Flow.parallel(
        ...slots.map((rootPos, index) => {
          const bodyPartMoves = getBodyPartMoves(rootPos, part);
          return bodyPartsToFlow[part]({
            container,
            pos: bodyPartMoves.getMove,
            rotation: () => bodyPartMoves.getRotation().orDefault(0),
            slot: index,
          });
        }),
      );
    };

    const startBodyParts = Flow.parallel(
      ...values(
        mapValues(bodyPartsConfig, (conf, part): Flow.PhaserNode => {
          if (isEventSolved(conf.requiredEvent)(scene))
            return spawnBodyPart(part as BodyPart);
          return Flow.noop;
        }),
      ),
    );

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
      Flow.observe(
        Def.creatureSceneClass.events.elemReadyToPick.subject,
        catchElement,
      ),
      Flow.handlePostUpdate({ handler: () => updateBodyPoints }),
      startBodyParts,
      moveLegs,
      clawMandibles,
    );
  });

export const createCentralGlurp = createGlurp({
  pos: new Vector2(gameWidth / 2, gameHeight / 2),
});
