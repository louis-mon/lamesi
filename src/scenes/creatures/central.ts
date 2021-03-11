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

  const updateBodyPoints = () => {
    const circle = new Phaser.Curves.Ellipse(0, 0, 225);
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

  const catchElement = ({ pos }: { pos: Vector2 }): Flow.PhaserNode =>
    Flow.lazy(() => {
      const tentacle = scene.add.rope(pos.x, pos.y, "central", "tentacle");
      const currentPos = pos.clone();
      const getTargetPos = () => getPointerPosInMainCam(scene);

      const tentacleState = Flow.makeSceneStates();

      return tentacleState.start(
        Flow.handlePostUpdate({
          handler: () => () => {
            const totalDiff = getTargetPos().distance(pos);
            const diff = getTargetPos().distance(currentPos);
            const speed = getTargetPos()
              .subtract(currentPos)
              .normalize()
              .scale((diff / totalDiff) * 20);
            currentPos.add(speed);
            const endPoint = currentPos.clone().subtract(pos);
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
    Flow.handlePostUpdate({ handler: () => updateBodyPoints }),
    catchElement({ pos: getObjectPosition(body) }),
  );
});
