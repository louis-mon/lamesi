import { PhaserNode } from "/src/helpers/phaser-flow";
import * as Phaser from "phaser";
import _ from "lodash";
import { boolean } from "purify-ts";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as Def from "./definitions";

import Vector2 = Phaser.Math.Vector2;
import {
  createSpriteAt,
  vecToXY,
  createImageAt,
  getObjectPosition,
  placeAt,
} from "/src/helpers/phaser";
import * as Npc from "./npc";
import { makeMenu } from "./menu";
import { subWordGameBeginEvent, gameWidth, gameHeight } from "../common";
import { annotate, ValueOf } from "/src/helpers/typing";
import {
  defineGoClass,
  declareGoInstance,
  customEvent,
  defineData,
  makeSceneDataHelper,
  declareGoInstances,
} from "/src/helpers/component";
import { combineContext, getProp } from "/src/helpers/functional";
import { combineLatest } from "rxjs";
import { map, pairwise, auditTime, first, tap } from "rxjs/operators";

const fireballClass = defineGoClass({
  data: {},
  events: { collideWall: customEvent() },
  kind: annotate<Phaser.GameObjects.Sprite>(),
});

export const launchFireball = ({
  targetPos,
  fromPos,
  radius,
}: {
  targetPos: Vector2;
  fromPos: Vector2;
  radius: number;
}): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const fireballDef = declareGoInstance(fireballClass, null);
    const fireballObj = scene.physics.add.existing(
      fireballDef
        .create(createSpriteAt(scene, fromPos, "npc", "fireball"))
        .setDepth(Def.depths.floating)
        .setAlpha(0.7)
        .setScale(0.001),
    ) as Phaser.Physics.Arcade.Sprite;
    fireballObj.body.isCircle = true;
    scene.physics.moveTo(fireballObj, targetPos.x, targetPos.y, 600);
    fireballObj.rotation = fireballObj.body.velocity.angle();
    const stopFireball: Flow.PhaserNode = Flow.sequence(
      Flow.call(() => {
        fireballObj.body.stop();
      }),
      Flow.tween({
        targets: fireballObj,
        props: { scale: 0 },
        delay: 100,
        duration: radius * 2,
      }),
      Flow.call(() => {
        fireballObj.destroy();
      }),
    );
    return Flow.withBackground({
      main: Flow.sequence(
        Flow.wait(fireballDef.events.collideWall.subject),
        stopFireball,
      ),
      back: Flow.parallel(
        Flow.tween({
          targets: fireballObj,
          props: { displayWidth: radius, displayHeight: radius },
          duration: 200,
        }),
        Flow.observe(
          Flow.arcadeOverlapSubject({
            object1: [
              Def.scene.data.wallGroup.value(scene),
              Def.scene.data.shieldGroup.value(scene),
            ],
            object2: fireballObj,
          }),
          () => Flow.call(fireballDef.events.collideWall.emit({})),
        ),
        Flow.observe(
          Flow.arcadeOverlapSubject({
            object1: fireballObj,
            object2: Def.player.getObj(scene),
          }),
          () => Flow.call(Def.scene.events.killPlayer.emit({})),
        ),
        Flow.sequence(
          Flow.waitTimer(1000),
          Flow.call(fireballDef.events.collideWall.emit({})),
        ),
      ),
    });
  });

type FlameThrowerConfig = {
  wp: Wp.WpDef;
  angle: number; // in radians;
};

const flameThrowerClass = defineGoClass({
  data: {
    continuous: annotate<boolean>(),
  },
  events: { fire: customEvent() },
  kind: annotate<Phaser.GameObjects.Sprite>(),
  config: annotate<FlameThrowerConfig>(),
});

export const flameThrowers = declareGoInstances(
  flameThrowerClass,
  "flame-thrower",
  {
    room2: {
      wp: { room: 2, x: 0, y: 3 },
      angle: 0,
    },
    room0ALeft: {
      wp: { room: 0, x: 0, y: 4 },
      angle: 0,
    },
    room0ARight: {
      wp: { room: 0, x: 4, y: 4 },
      angle: Math.PI,
    },
    room0BLeft: {
      wp: { room: 0, x: 0, y: 0 },
      angle: 0,
    },
    room0BRight: {
      wp: { room: 0, x: 4, y: 0 },
      angle: Math.PI,
    },
  },
);

export type FlameThrower = ValueOf<typeof flameThrowers>;

export const createFlameThrower = (instance: FlameThrower): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const object = instance.create(
      createSpriteAt(scene, new Vector2(0, 0), "npc", "flamethrower")
        .setDepth(Def.depths.npcHigh)
        .setRotation(instance.config.angle),
    );
    const fireOffset = object.displayWidth / 2;
    placeAt(
      object,
      Wp.wpPos(instance.config.wp).subtract(
        new Vector2().setToPolar(
          instance.config.angle,
          Wp.wpHalfSize.x + fireOffset,
        ),
      ),
    );
    const fire = Flow.lazy(() =>
      launchFireball({
        radius: 30,
        fromPos: getObjectPosition(object).add(
          new Vector2().setToPolar(instance.config.angle, fireOffset + 2),
        ),
        targetPos: getObjectPosition(object).add(
          new Vector2().setToPolar(instance.config.angle, fireOffset + 10),
        ),
      }),
    );
    instance.data.continuous.setValue(false)(scene);
    return Flow.parallel(
      Flow.observe(instance.events.fire.subject, () => fire),
      Flow.taskWithSentinel({
        condition: instance.data.continuous.dataSubject,
        task: Flow.repeat(
          Flow.sequence(
            Flow.waitTimer(120),
            Flow.call(instance.events.fire.emit({})),
          ),
        ),
      }),
    );
  });

export const createAllFlameThrowers: Flow.PhaserNode = Flow.parallel(
  ...Object.values(flameThrowers).map(createFlameThrower),
);
