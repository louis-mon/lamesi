import {
  createImageAt,
  createSpriteAt,
  createSpriteWithPhysicsAt,
  makeAnimFrames,
  ManipulableObject,
  placeAt,
  SceneContext,
  vecToXY,
} from "/src/helpers/phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { launchFireball } from "/src/scenes/dungeon/fireball";
import _, { identity } from "lodash";
import * as Phaser from "phaser";
import { map } from "rxjs/operators";
import * as Def from "./definitions";
import * as Wp from "./wp";
import Vector2 = Phaser.Math.Vector2;
import { getProp } from "/src/helpers/functional";
import { followObject } from "/src/helpers/animate/composite";
import {
  customEvent,
  declareGoInstance,
  defineGoClass,
} from "/src/helpers/component";
import { annotate } from "/src/helpers/typing";
import { combineLatest } from "rxjs";
import { bindAttackButton, endGoalAltarPlaceholder } from "./npc";
import { globalData } from "../common/global-data";
import { iceArmorAltar } from "./ice-armor";

const dragonHeadClass = defineGoClass({
  events: {
    newState: customEvent<Flow.PhaserNode>(),
    throwFireball: customEvent(),
  },
  data: {
    hp: annotate<number>(),
  },
  kind: annotate<Phaser.Physics.Arcade.Sprite>(),
});

const goalPos = { room: 1, x: 2, y: 1 };
const toggleForbiddenPos = (disabled: boolean) =>
  Wp.setGraphWpDisabled({
    wpId: Wp.getWpId(goalPos),
    disabled,
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
            offset: stun.getCenter().subtract(target.getCenter()),
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
      awaken: Flow.tween({
        targets: wing,
        props: vecToXY(posAwaken),
        duration: timeAwaken,
      }),
      awake: Flow.tween({
        targets: wing,
        props: {
          angle: flip * 20,
        },
        duration: 700,
        yoyo: true,
        repeat: -1,
      }),
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
  const initialHp = 3;
  const initHp = headInst.data.hp.setValue(initialHp);
  initHp(scene);

  const eatPlayerCondition = () =>
    Def.player.data.currentPos.dataSubject(scene).pipe(
      map(Wp.getWpDef),
      map((pos) => pos.x >= 1 && pos.x <= 3 && pos.y >= 2 && pos.y <= 3),
    );

  const eatPlayerState = Flow.lazy(() =>
    Flow.sequence(
      Flow.tween({
        targets: headObj,
        props: vecToXY(Def.player.getObj(scene).getCenter()),
        duration: 200,
      }),
      Flow.call(Def.scene.events.killPlayer.emit({})),
      Flow.waitTimer(300),
      Flow.tween({
        targets: headObj,
        props: vecToXY(headPosAwaken),
        duration: 200,
      }),
      emitNewState(goToSleepState()),
    ),
  );

  const awakenHead = Flow.sequence(
    Flow.call(initHp),
    Flow.tween({
      targets: headObj,
      duration: timeAwaken,
      props: vecToXY(headPosAwaken),
    }),
  );
  const sleepHead = Flow.tween({
    targets: headObj,
    duration: timeAwaken,
    props: vecToXY(headPosSleep),
  });

  const footClass = defineGoClass({
    events: {},
    data: { hit: annotate<boolean>() },
    kind: annotate<Phaser.GameObjects.Sprite>(),
    config: annotate<{ pos: Wp.WpDef; flip: number }>(),
  });
  const footInsts = [1, -1].map((flip) => {
    const inst = declareGoInstance(footClass, null, {
      pos: { room: 1, x: flip + 2, y: 2 },
      flip,
    });
    inst.create(
      createSpriteAt(
        scene,
        new Vector2(-flip * 10, 20).add(basePos),
        "dragon",
        "foot",
      )
        .setOrigin(1, 0)
        .setFlipX(flip === 1)
        .setDepth(Def.depths.npc),
    );
    return inst;
  });

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

  const emitNewState = (state: Flow.PhaserNode): Flow.PhaserNode =>
    Flow.call(headInst.events.newState.emit(state));

  const killingState = (): Flow.PhaserNode =>
    Flow.sequence(
      Flow.tween({
        targets: [
          ...eyeObjs,
          headObj,
          ...wingDefs.map(getProp("wing")),
          ...footInsts.map((inst) => inst.getObj(scene)),
          bodyObj,
        ],
        props: { alpha: 0 },
      }),
      Flow.call(toggleForbiddenPos(false)),
      endGoalAltarPlaceholder({ n: 5, wp: goalPos }),
    );

  const downBody = (): Flow.PhaserNode =>
    Flow.parallel(...wingDefs.map(getProp("sleep")), sleepBody, sleepHead);

  const stunnedDownState = (): Flow.PhaserNode =>
    Flow.sequence(
      Flow.parallel(
        downBody(),
        ...footInsts.map((footInst) =>
          Flow.parallel(
            Flow.tween(() => ({
              targets: footInst.getObj(scene),
              props: { angle: -footInst.config.flip * 20 },
              duration: 150,
            })),
          ),
        ),
      ),
      Flow.parallel(
        bindAttackButton({
          pos: Wp.getWpId({ room: 1, x: 2, y: 2 }),
          action: emitNewState(killingState()),
        }),
      ),
    );

  const stunnedState = Flow.parallel(
    stunEffect({ target: headObj, infinite: true }),
    Flow.whenTrueDo({
      condition: combineLatest(
        footInsts.map((inst) => inst.data.hit.dataSubject(scene)),
      ).pipe(map((values) => values.every(identity))),
      action: Flow.sequence(
        Flow.waitTimer(1000),
        emitNewState(stunnedDownState()),
      ),
    }),
    ...footInsts.map((footInst) =>
      Flow.parallel(
        Flow.call(footInst.data.hit.setValue(false)),
        Flow.whenTrueDo({
          condition: footInst.data.hit.subject,
          action: Flow.tween(() => ({
            targets: footInst.getObj(scene),
            props: { angle: -footInst.config.flip * 20 },
            yoyo: true,
            repeat: -1,
            duration: 280,
          })),
        }),
        bindAttackButton({
          pos: Wp.getWpId(footInst.config.pos),
          disabled: footInst.data.hit.dataSubject,
          action: Flow.call(footInst.data.hit.setValue(true)),
        }),
      ),
    ),
  );

  const awakeState = (): Flow.PhaserNode =>
    Flow.parallel(
      ...wingDefs.map(getProp("awake")),
      Flow.observe(playerInRoom, (inRoom) =>
        inRoom ? Flow.noop : emitNewState(goToSleepState()),
      ),
      Flow.whenTrueDo({
        condition: eatPlayerCondition,
        action: emitNewState(eatPlayerState),
      }),
      Flow.observe(headInst.data.hp.subject, (hp) =>
        hp > 0
          ? stunEffect({
              target: headObj,
              infinite: false,
            })
          : emitNewState(stunnedState),
      ),
      Flow.repeatWhen({
        condition: Def.interactableEvents.hitPhysical(headInst.key).subject,
        action: Flow.sequence(
          Flow.call(headInst.data.hp.updateValue((hp) => hp - 1)),
          Flow.waitTimer(1000),
        ),
      }),
      Flow.repeatSequence(
        ..._.range(0, 14).map((i) =>
          Flow.sequence(
            Flow.call(headInst.events.throwFireball.emit({})),
            Flow.waitTimer(70),
          ),
        ),
        Flow.lazy(() =>
          // When hit, the dragon becomes angry and never stops breathing fire
          // This is to prevent the player to hide and fire arrows between breathes
          headInst.data.hp.value(scene) === initialHp
            ? Flow.waitTimer(1200)
            : Flow.noop,
        ),
      ),
    );

  const goToSleepState = (): Flow.PhaserNode =>
    Flow.parallel(
      sleepState(),
      Flow.sequence(
        Flow.sequence(
          Flow.parallel(...wingDefs.map(getProp("calm"))),
          Flow.parallel(
            Flow.call(() =>
              eyeObjs.forEach((eye) =>
                eye.anims.playReverse("dragon-eye", false),
              ),
            ),
            downBody(),
          ),
        ),
        emitNewState(sleepState()),
      ),
    );

  const awakeningState = (): Flow.PhaserNode =>
    Flow.sequence(
      Flow.parallel(
        ...wingDefs.map(getProp("awaken")),
        ...eyeFlows.map(getProp("awaken")),
        awakenBody,
        awakenHead,
      ),
      emitNewState(awakeState()),
    );

  const sleepState = (): Flow.PhaserNode =>
    Flow.whenTrueDo({
      condition: playerInRoom,
      action: emitNewState(awakeningState()),
    });

  return Flow.parallel(
    Flow.call(toggleForbiddenPos(true)),
    ...eyeFlows.map(getProp("flow")),
    Flow.observeSentinel(headInst.events.newState.subject, identity),
    emitNewState(sleepState()),
    Flow.observe(headInst.events.throwFireball.subject, () =>
      Flow.lazy(() =>
        Flow.parallel(
          ..._.range(-2, 3).map((i) =>
            launchFireball({
              radius: 75,
              startScale: 0.2,
              fromPos: headObj.getBottomCenter(),
              targetPos: Phaser.Math.RotateAround(
                Def.player.getObj(scene).getCenter(),
                headObj.x,
                headObj.y,
                (i * Math.PI) / 15,
              ),
            }),
          ),
        ),
      ),
    ),
  );
});

export const enableGoal5 = Flow.whenTrueDo({
  condition: globalData.dungeonPhase4.dataSubject,
  action: Flow.parallel(iceArmorAltar),
});
