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
import { combineContext } from "/src/helpers/functional";
import { combineLatest, fromEvent } from "rxjs";
import { map } from "rxjs/operators";
import * as Def from "./def";
import _ from "lodash";
import { followPosition, followRotation } from "/src/helpers/animate/composite";

type CreateBudParams = {
  pos: Vector2;
  level: number;
  angleR: number;
};

const swingController = (rope: Phaser.GameObjects.Rope) => {
  let value = 0;
  const dist = (_.last(rope.points)?.y ?? 0) / rope.points.length;
  return {
    get value() {
      return value;
    },
    set value(newValue: number) {
      value = newValue;
      _.range(0, rope.points.length).forEach((i) => {
        Phaser.Math.RotateTo(
          rope.points[i],
          0,
          0,
          (((i * newValue) / rope.points.length) * Math.PI) / 6 + Math.PI / 2,
          i * dist,
        );
      });
      rope.dirty = true;
    },
  };
};

const bloomEye = ({ bud }: { bud: ManipulableObject }): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const vine = scene.add
      .rope(
        bud.x,
        bud.y,
        "tree",
        "vine",
        _.range(30).map((y) => ({ x: 0, y: y * 4 })),
        false,
      )
      .setDepth(Def.dephts.treeVine)
      .setScale(1, 0);
    const swing = swingController(vine);
    const doSwing = (props: Partial<Phaser.Types.Tweens.TweenBuilderConfig>) =>
      Flow.tween({
        targets: swing,
        ease: "sine.InOut",
        yoyo: true,
        ...props,
        duration: (props.duration ?? 1) * 940,
      });

    const leaves = scene.add
      .sprite(0, 0, "tree", "leaves")
      .setScale(0)
      .setDepth(Def.dephts.treeVine);

    const eyeblank = scene.add
      .sprite(0, 0, "tree", "eye-blank")
      .setDepth(Def.dephts.treeVine)
      .setScale(0);

    const eyelid = scene.add
      .sprite(0, 0, "tree", "eyelid-1")
      .setScale(0)
      .setDepth(Def.dephts.treeVine);

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

    const getVineEndpos = () =>
      getObjectPosition(vine).add(new Vector2(_.last(vine.points)!));

    const getVineEndRotation = () => {
      const [a1, a2] = _.takeRight(vine.points, 2);
      return new Vector2(a1).subtract(new Vector2(a2)).angle() - Math.PI / 2;
    };

    return Flow.sequence(
      Flow.parallel(
        Flow.tween({ targets: bud, props: { scale: 0 }, duration: 400 }),
        Flow.call(() => bud.destroy()),
        Flow.tween({ targets: vine, props: { scaleY: 1 }, duration: 873 }),
      ),
      Flow.parallel(
        Flow.sequence(
          doSwing({ props: { value: -1 }, duration: 1, yoyo: false }),
          Flow.repeat(doSwing({ props: { value: 1 }, duration: 2 })),
        ),
        followPosition({
          getPos: getVineEndpos,
          target: () => leaves,
        }),
        followPosition({
          getPos: getVineEndpos,
          target: () => eyelid,
        }),
        followPosition({
          getPos: getVineEndpos,
          target: () => eyeblank,
        }),
        followRotation({
          getRotation: getVineEndRotation,
          target: () => leaves,
        }),
        followRotation({
          getRotation: getVineEndRotation,
          target: () => eyelid,
        }),
        followRotation({
          getRotation: () => {
            const pointer = scene.input.activePointer;
            return pointer.position
              .clone()
              .subtract(getObjectPosition(eyeblank))
              .angle();
          },
          target: () => eyeblank,
        }),
        Flow.sequence(
          Flow.tween({ targets: leaves, props: { scale: 1.3, duration: 580 } }),
          Flow.tween({
            targets: [eyelid, eyeblank],
            props: { scale: 1, duration: 580 },
          }),
        ),
        Flow.repeatSequence(
          Flow.waitTimer(3000),
          Flow.call(() => eyelid.play(eyeAnimKey)),
          Flow.waitTimer(400),
          Flow.call(() => eyelid.play(eyeAnimKey)),
        ),
      ),
    );
  });

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
      const length = 200 / Math.pow(1.7, params.level);
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
      trunk.setScale((length / trunk.height) * 0.7, 0);
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
      Flow.tween({ targets: bud, props: { scale: 1.3 }, duration: 500 }),
      Flow.wait(commonGoEvents.pointerdown(budInst.key).subject),
      Flow.lazy(() =>
        params.level === 0
          ? createSubBud(0)
          : params.level === 4
          ? bloomEye({ bud })
          : Flow.parallel(createSubBud(1), createSubBud(-1)),
      ),
    );
  });

export const createTree: Flow.PhaserNode = Flow.lazy((scene) =>
  createBud({
    pos: new Vector2(gameWidth - 330, gameHeight - 85),
    level: 0,
    angleR: -Math.PI / 2,
  }),
);
