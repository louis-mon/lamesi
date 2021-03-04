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
import * as Def from "./def";

type CreateBudParams = {
  pos: Vector2;
  level: number;
  angleR: number;
};

const createBud = (params: CreateBudParams): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const displayRot = (angle: number) => angle + Math.PI / 2;
    const bud = createSpriteAt(scene, params.pos, "tree", "bud")
      .setScale(0)
      .setRotation(displayRot(params.angleR))
      .setDepth(Def.dephts.treeBud)
      .setInteractive();
    const budInst = declareGoInstance(spriteClassKind, null);
    budInst.create(bud);

    const createSubBud = (dAngle: number) => {
      const newAngle =
        params.angleR +
        dAngle * ((Math.PI * 2) / 3 / Math.pow(1.7, params.level));
      const length = 150 / Math.pow(1.5, params.level);
      const targetPos = Phaser.Math.RotateTo(
        new Vector2(),
        params.pos.x,
        params.pos.y,
        newAngle,
        length,
      );
      const trunk = createSpriteAt(scene, params.pos, "tree", "trunk")
        .setDepth(Def.dephts.treeTrunk)
        .setRotation(displayRot(newAngle))
        .setOrigin(0.5, 1);
      trunk.setScale(length / trunk.height, 0);
      return Flow.sequence(
        Flow.parallel(
          Flow.sequence(
            Flow.tween({ targets: bud, props: { scale: 0 }, duration: 400 }),
            Flow.call(() => bud.destroy()),
          ),
          Flow.tween({
            targets: trunk,
            props: { scaleY: length / trunk.height },
            duration: 600,
          }),
        ),
        createBud({
          pos: targetPos,
          level: params.level + 1,
          angleR: newAngle,
        }),
      );
    };

    return Flow.sequence(
      Flow.tween({ targets: bud, props: { scale: 1 }, duration: 500 }),
      Flow.wait(commonGoEvents.pointerdown(budInst.key).subject),
      Flow.lazy(() =>
        params.level === 0
          ? createSubBud(0)
          : Flow.parallel(createSubBud(1), createSubBud(-1)),
      ),
    );
  });

export const createTree: Flow.PhaserNode = Flow.lazy((scene) =>
  createBud({ pos: new Vector2(1500, 900), level: 0, angleR: -Math.PI / 2 }),
);
