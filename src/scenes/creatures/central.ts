import Vector2 = Phaser.Math.Vector2;
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
import { subWordGameBeginEvent, gameWidth, gameHeight } from "../common";
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
import _ from "lodash";
import { followPosition, followRotation } from "/src/helpers/animate/composite";
import { Maybe } from "purify-ts";
import { makeStatesFlow } from "/src/helpers/animate/flow-state";

export const createCentralCreature: Flow.PhaserNode = Flow.lazy((scene) => {
  const body = scene.add.rope(
    gameWidth / 2,
    gameHeight / 2,
    "central",
    "central",
  );

  const spasms: Array<{ pos: number; t: number }> = [];
  const bodyDiameter = 225;

  const updateBodyPoints = () => {
    const circle = new Phaser.Curves.Ellipse(0, 0, bodyDiameter);
    const points = circle.getPoints(0, 5).concat([circle.getStartPoint()]);
    spasms.forEach((spasm) => {
      const t = scene.time.now - spasm.t;
      _.range(0, points.length).forEach((i) => {
        const pos = i / points.length;
        const point = points[i];
        const dist = Math.min(
          Math.abs(pos - spasm.pos),
          1 - Math.abs(pos - spasm.pos),
        );
        const value =
          Math.cos(t / 70) *
          45 *
          Math.exp(-((t / 500) ** 2)) *
          Math.exp(-((dist / 0.1) ** 2));
        points[i] = point
          .clone()
          .add(circle.getTangent(pos).normalizeRightHand().scale(value));
      });
    });

    body.setPoints(points);
    body.setDirty();
  };

  const availableSlots = {
    eye: _.range(8).map((i) =>
      new Vector2()
        .setToPolar(
          -Math.PI / 2 + ((i % 2 === 0 ? i + 1 : -i) * Math.PI) / 14,
          bodyDiameter - 58,
        )
        .add(getObjectPosition(body)),
    ),
  };

  const catchElement = (pickEvent: { key: string }): Flow.PhaserNode =>
    Flow.lazy(() => {
      const pickableInst = declareGoInstance(
        Def.movableElementClass,
        pickEvent.key,
      );
      const rootPos = availableSlots.eye.shift();
      if (!rootPos) return Flow.noop;
      const tentacle = scene.add
        .rope(rootPos.x, rootPos.y, "central", "tentacle")
        .setDepth(Def.dephts.tentacle);
      const currentPos = rootPos.clone();

      const tentacleState = Flow.makeSceneStates();

      const retractTentacle: Flow.PhaserNode = Flow.lazy(() => {
        return Flow.parallel(
          Flow.handlePostUpdate({
            handler: () => () => {
              const diff = updateTentaclePos(rootPos);
              if (diff < 2) {
                currentPos.setFromObject(rootPos);
                tentacleState.next(Flow.noop);
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
        const path = new Phaser.Curves.Line(new Vector2(0, 0), endPoint);
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
