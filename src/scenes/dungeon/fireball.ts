import { PhaserNode } from "/src/helpers/phaser-flow";
import * as Phaser from "phaser";
import _ from "lodash";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as Def from "./definitions";

import Vector2 = Phaser.Math.Vector2;
import { createSpriteAt, vecToXY, createImageAt } from "/src/helpers/phaser";
import * as Npc from "./npc";
import { makeMenu } from "./menu";
import { subWordGameBeginEvent, gameWidth, gameHeight } from "../common";
import { annotate } from "/src/helpers/typing";
import {
  defineGoClass,
  declareGoInstance,
  customEvent,
  defineData,
  makeSceneDataHelper,
} from "/src/helpers/component";
import { combineContext, getProp } from "/src/helpers/functional";
import { combineLatest } from "rxjs";
import { map, pairwise, auditTime, first } from "rxjs/operators";

const fireballClass = defineGoClass({
  data: {},
  events: { collideWall: customEvent() },
  kind: annotate<Phaser.GameObjects.Sprite>(),
});

export const launchFireball = ({
  targetPos,
  fromPos,
}: {
  targetPos: Vector2;
  fromPos: Vector2;
}): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const fireballDef = declareGoInstance(fireballClass, null);
    const fireballObj = scene.physics.add.existing(
      fireballDef
        .create(createSpriteAt(scene, fromPos, "menu", "magic-arrow"))
        .setDepth(Def.depths.floating)
        .setScale(0.1),
    ) as Phaser.Physics.Arcade.Sprite;
    scene.physics.moveTo(fireballObj, targetPos.x, targetPos.y, 1200);
    fireballObj.rotation =
      fireballObj.body.velocity.angle() - (Math.PI / 4) * 3;
    const zoomTween = scene.add.tween({
      targets: fireballObj,
      props: { scale: 1.5 },
      duration: 50,
    });
    const stopfireball: Flow.PhaserNode = Flow.sequence(
      Flow.call(() => {
        fireballObj.body.stop();
        zoomTween.stop();
      }),
      Flow.tween({
        targets: fireballObj,
        props: { scale: 0 },
        delay: 100,
        duration: 200,
      }),
      Flow.call(() => {
        fireballObj.destroy();
      }),
    );
    return Flow.withBackground({
      main: Flow.sequence(
        Flow.wait(fireballDef.events.collideWall.subject),
        stopfireball,
      ),
      back: Flow.parallel(
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
