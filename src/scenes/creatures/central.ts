import Vector2 = Phaser.Math.Vector2;
import {
  createSpriteAt,
  vecToXY,
  createImageAt,
  placeAt,
  addPhysicsFromSprite,
  ManipulableObject,
  getObjectPosition,
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
  );
});
