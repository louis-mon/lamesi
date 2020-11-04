import {
  createImageAt,
  createSpriteAt,
  createSpriteWithPhysicsAt,
  getObjectPosition,
  makeAnimFrames,
  ManipulableObject,
  placeAt,
  SceneContext,
  vecToXY,
} from "/src/helpers/phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { launchFireball } from "/src/scenes/dungeon/fireball";
import _ from "lodash";
import * as Phaser from "phaser";
import { map } from "rxjs/operators";
import * as Def from "./definitions";
import * as Wp from "./wp";
import Vector2 = Phaser.Math.Vector2;
import { getProp } from "/src/helpers/functional";
import { followObject } from "/src/helpers/animate/composite";
import { declareGoInstance, defineGoClass } from "/src/helpers/component";
import { annotate } from "/src/helpers/typing";
import { combineLatest } from "rxjs";

const dragonHeadClass = defineGoClass({
  events: {},
  data: {
    hp: annotate<number>(),
  },
  kind: annotate<Phaser.Physics.Arcade.Sprite>(),
});

const stunEffect = ({
  target,
  infinite,
}: {
  target: ManipulableObject;
  infinite: boolean;
}): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const stuns = [
      target.getTopLeft().add(new Vector2(10, 20)),
      target.getTopCenter().add(new Vector2(5)),
      target.getTopRight().add(new Vector2(-10, 20)),
    ].map((pos) =>
      createImageAt(scene, pos, "dragon", "stunned")
        .setScale(0.01)
        .setDepth(Def.depths.floating),
    );
    const originalX = target.x;
    return Flow.withCleanup({
      flow: Flow.concurrent(
        Flow.sequence(
          Flow.tween({
            targets: stuns,
            props: {
              scale: 1,
            },
            duration: 470,
          }),
          infinite
            ? Flow.infinite
            : Flow.tween({
                targets: stuns,
                props: {
                  alpha: 0,
                },
                duration: 600,
              }),
        ),
        Flow.withCleanup({
          flow: Flow.parallel(
            Flow.repeatSequence(
              Flow.tween({
                targets: target,
                ease: "sine.out",
                props: { x: "-=7" },
                duration: 200,
              }),
              Flow.tween({
                targets: target,
                ease: "sine.inout",
                props: { x: "+=14" },
                duration: 400,
              }),
              Flow.tween({
                targets: target,
                ease: "sine.in",
                props: { x: "-=7" },
                duration: 200,
              }),
            ),
          ),
          cleanup: () => (target.x = originalX),
        }),
        Flow.tween({
          targets: stuns,
          props: {
            angle: 360,
          },
          duration: 800,
          repeat: -1,
        }),
        ...stuns.map((stun) =>
          followObject({
            offset: getObjectPosition(stun).subtract(getObjectPosition(target)),
            source: () => target,
            target: () => stun,
          }),
        ),
      ),
      cleanup: () => stuns.forEach((stun) => stun.destroy()),
    });
  });

export const dragon: Flow.PhaserNode = Flow.lazy((scene) => {
  const basePos = new Vector2(0, -25.0).add(Wp.wpPos({ room: 1, x: 2, y: 1 }));
  const timeAwaken = 600;
  const wingDefs = [1, -1].map((flip) => {
    const startAngle = -10 * flip;
    const posAwaken = new Vector2(flip * 30, -40).add(basePos);
    const posSleep = new Vector2(flip * 30, -7).add(basePos);
    const wing = createSpriteAt(scene, posSleep, "dragon", "wing")
      .setFlipX(flip === 1)
      .setAngle(startAngle)
      .setDepth(Def.depths.npc)
      .setOrigin(1, 0.3);
    return {
      wing,
      awaken: Flow.sequence(
        Flow.tween({
          targets: wing,
          props: vecToXY(posAwaken),
          duration: timeAwaken,
        }),
        Flow.tween({
          targets: wing,
          props: {
            angle: flip * 20,
          },
          duration: 700,
          yoyo: true,
          repeat: -1,
        }),
      ),
      calm: Flow.tween({
        targets: wing,
        props: {
          angle: startAngle,
        },
        duration: 900,
      }),
      sleep: Flow.tween({
        targets: wing,
        props: vecToXY(posSleep),
        duration: timeAwaken,
      }),
    };
  });

  const bodySleepScale = 0.5;
  const bodyObj = createSpriteAt(
    scene,
    new Vector2(0, 16).add(basePos),
    "dragon",
    "body",
  ).setDepth(Def.depths.npc);
  bodyObj.scaleY = bodySleepScale;
  const awakenBody = Flow.tween({
    targets: bodyObj,
    duration: timeAwaken,
    props: { scaleY: 1 },
  });
  const sleepBody = Flow.tween({
    targets: bodyObj,
    duration: timeAwaken,
    props: { scaleY: bodySleepScale },
  });

  const headPosAwaken = new Vector2(0, -70).add(basePos);
  const headPosSleep = new Vector2(0, 30).add(basePos);
  const headInst = declareGoInstance(dragonHeadClass, null);
  const headObj = headInst
    .create(createSpriteWithPhysicsAt(scene, headPosSleep, "dragon", "head"))
    .setDepth(Def.depths.npcHigh);
  Def.scene.data.interactableGroup.value(scene).add(headObj);
  const initHp = headInst.data.hp.setValue(3);
  initHp(scene);
  const awakenHead = Flow.sequence(
    Flow.call(initHp),
    Flow.tween({
      targets: headObj,
      duration: timeAwaken,
      props: vecToXY(headPosAwaken),
    }),
    Flow.repeatWhen({
      condition: Def.interactableEvents.hitPhysical(headInst.key).subject,
      action: Flow.lazy(() => {
        headInst.data.hp.updateValue((hp) => hp - 1)(scene);
        return stunEffect({
          target: headObj,
          infinite: headInst.data.hp.value(scene) === 0,
        });
      }),
    }),
  );
  const sleepHead = Flow.tween({
    targets: headObj,
    duration: timeAwaken,
    props: vecToXY(headPosSleep),
  });

  const footObjs = [1, -1].map((flip) =>
    createSpriteAt(
      scene,
      new Vector2(flip * 50, 60).add(basePos),
      "dragon",
      "foot",
    )
      .setFlipX(flip === 1)
      .setDepth(Def.depths.npc),
  );

  const eyeAnim = "dragon-eye";
  scene.anims.create({
    key: eyeAnim,
    duration: 500,
    frames: makeAnimFrames("dragon", ["eye-closed", "eye-closing", "eye-open"]),
  });

  const eyeFlows = [1, -1].map((flip) => {
    const eye = scene.add
      .sprite(0, 0, "dragon", "eye-closed")
      .setFlipX(flip === 1)
      .setDepth(Def.depths.npcHigh + 1);
    return {
      eye,
      awaken: Flow.call(() => eye.anims.play(eyeAnim)),
      flow: followObject({
        source: () => headObj,
        target: () => eye,
        offset: new Vector2(flip * 15, 0),
      }),
    };
  });
  const eyeObjs = eyeFlows.map(getProp("eye"));

  const playerInRoom = () =>
    Def.player.data.currentPos
      .dataSubject(scene)
      .pipe(map((wpId) => Wp.getWpDef(wpId).room === 1));

  return Flow.parallel(
    ...eyeFlows.map(getProp("flow")),
    Flow.taskWithSentinel({
      condition: playerInRoom,
      task: Flow.parallel(
        ...wingDefs.map(getProp("awaken")),
        ...eyeFlows.map(getProp("awaken")),
        awakenBody,
        awakenHead,
      ),
      afterTask: Flow.sequence(
        Flow.parallel(...wingDefs.map(getProp("calm"))),
        Flow.parallel(
          Flow.call(() =>
            eyeObjs.forEach((eye) =>
              eye.anims.playReverse("dragon-eye", false),
            ),
          ),
          ...wingDefs.map(getProp("sleep")),
          sleepBody,
          sleepHead,
        ),
      ),
    }),
    Flow.repeatWhen({
      condition: () =>
        combineLatest([
          playerInRoom(),
          headInst.data.hp.dataSubject(scene),
        ]).pipe(map(([inRoom, hp]) => inRoom && hp > 0)),
      action: Flow.sequence(
        Flow.waitTimer(800),
        Flow.parallel(
          ..._.range(0, 14).map((i) =>
            Flow.sequence(
              Flow.waitTimer(i * 70),
              Flow.lazy(() =>
                Flow.parallel(
                  ..._.range(-2, 3).map((i) =>
                    launchFireball({
                      radius: 75,
                      startScale: 0.2,
                      fromPos: headObj.getBottomCenter(),
                      targetPos: Phaser.Math.RotateAround(
                        getObjectPosition(Def.player.getObj(scene)).clone(),
                        headObj.x,
                        headObj.y,
                        (i * Math.PI) / 15,
                      ),
                    }),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    }),
  );
});
