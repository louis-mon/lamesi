import {
  createSpriteAt,
  getObjectPosition,
  ManipulableObject,
  placeAt,
  SceneContext,
  vecToXY,
} from "/src/helpers/phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { launchFireball } from "/src/scenes/dungeon/fireball";
import _, { identity } from "lodash";
import * as Phaser from "phaser";
import { map, tap } from "rxjs/operators";
import * as Def from "./definitions";
import * as Wp from "./wp";
import * as Npc from "./npc";
import Vector2 = Phaser.Math.Vector2;
import { getProp } from "/src/helpers/functional";
import { followObject } from "/src/helpers/animate/composite";
import { BehaviorSubject, combineLatest, Subject } from "rxjs";

export const equipFireShield: Flow.PhaserNode = Flow.lazy((scene) => {
  Def.scene.data.playerHasArmor.setValue(false)(scene);
  Def.scene.data.fireShieldActive.setValue(false)(scene);

  const fireShieldCondition = () =>
    combineLatest([
      Def.scene.data.currentSkill.dataSubject(scene),
      Def.scene.data.currentSkillInUse.dataSubject(scene),
      Def.scene.data.playerHasArmor.dataSubject(scene),
    ]).pipe(
      map(
        ([skill, inUse, hasArmor]) =>
          (skill === Def.amuletSkillKey && inUse) || hasArmor,
      ),
    );
  const shieldOff: Flow.PhaserNode = Flow.lazy(() =>
    Flow.whenTrueDo({
      condition: fireShieldCondition(),
      action: Flow.call(() => nextState(shieldOn)),
    }),
  );
  const shieldOn: Flow.PhaserNode = Flow.lazy(() => {
    const shield = scene.physics.add
      .image(0, 0, "npc", "ice-shield")
      .setDepth(Def.depths.floating)
      .setAlpha(0);
    shield.body.isCircle = true;
    Def.scene.data.shieldGroup.value(scene).add(shield);

    return Flow.withCleanup({
      cleanup: () => shield.destroy(),
      flow: Flow.parallel(
        followObject({
          source: Def.player.getObj,
          target: () => shield,
          offset: new Vector2(),
        }),
        Flow.call(Def.scene.data.fireShieldActive.setValue(true)),
        Flow.tween({ targets: shield, props: { alpha: 0.6 }, duration: 600 }),
        Flow.whenTrueDo({
          condition: fireShieldCondition().pipe(map((x) => !x)),
          action: Flow.sequence(
            Flow.call(Def.scene.data.fireShieldActive.setValue(false)),
            Flow.tween({
              targets: shield,
              props: { alpha: 0 },
              duration: 300,
            }),
            Flow.call(() => nextState(shieldOff)),
          ),
        }),
      ),
    });
  });

  const flowObservable = new Subject();
  const nextState = (flow: Flow.PhaserNode) => flowObservable.next(flow);

  return Flow.parallel(
    Flow.observeSentinel(flowObservable, identity),
    Flow.call(() => nextState(shieldOff)),
  );
});

export const iceArmorAltar = Npc.altarComponent({
  wp: { room: 4, x: 2, y: 3 },
  createItem: (p) => (scene) =>
    createSpriteAt(scene, p.pos, "menu", "ice-armor"),
  key: "ice-armor-altar",
  action: Flow.lazy((scene) => {
    const armor = scene.add
      .image(0, 0, "menu", "ice-armor")
      .setDepth(Def.depths.npcHigh)
      .setScale(0.3);
    return Flow.parallel(
      followObject({
        source: Def.player.getObj,
        target: () => armor,
        offset: new Vector2(),
      }),
      Flow.call(Def.scene.data.playerHasArmor.setValue(true)),
    );
  }),
});
