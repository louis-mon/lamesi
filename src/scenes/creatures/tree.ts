import Vector2 = Phaser.Math.Vector2;
import {
  createSpriteAt,
  vecToXY,
  createImageAt,
  placeAt,
  addPhysicsFromSprite,
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
import { combineContext } from "/src/helpers/functional";
import { combineLatest, fromEvent } from "rxjs";
import { map } from "rxjs/operators";

type CreateBudParams = {
  pos: Vector2;
  level: number;
  angleR: number;
};

const createBud = (params: CreateBudParams): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const bud = createSpriteAt(scene, params.pos, "tree", "bud")
      .setScale(0)
      .setRotation(params.angleR);
    const budInst = declareGoInstance(spriteClassKind, null);
    budInst.create(bud);
    return Flow.sequence(
      Flow.tween({ targets: bud, props: { scale: 1 } }),
      Flow.wait(commonGoEvents.pointerdown(budInst.key).subject),
      createBud({
        pos: Phaser.Math.RotateTo(
          new Vector2(),
          params.pos.x,
          params.pos.y,
          params.angleR,
          50,
        ),
        level: params.level + 1,
        angleR: params.angleR,
      }),
    );
  });

export const createTree: Flow.PhaserNode = Flow.lazy((scene) =>
  createBud({ pos: new Vector2(1400, 700), level: 0, angleR: 0 }),
);
