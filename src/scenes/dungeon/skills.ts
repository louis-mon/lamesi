import * as Phaser from "phaser";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as Npc from "./npc";
import * as Def from "./definitions";

import Vector2 = Phaser.Math.Vector2;
import {
  createSpriteAt,
  getObjectPosition,
  SceneContext,
} from "/src/helpers/phaser";
import {
  defineGoClass,
  declareGoInstance,
  commonInputEvents,
  customEvent,
} from "/src/helpers/component";
import { annotate } from "/src/helpers/typing";
import { take, map, tap, first } from "rxjs/operators";
import { of, Observable } from "rxjs";
import { combineContext } from "/src/helpers/functional";
import { bindSkillButton } from "./menu";

export const initSkills: Flow.PhaserNode = Flow.call((scene) => {
  Def.scene.data.currentSkill.setValue("")(scene);
});

const arrowClass = defineGoClass({
  data: {},
  events: { explodeArrow: customEvent() },
  kind: annotate<Phaser.GameObjects.Sprite>(),
});

type SkillDef = {
  key: string;
  useAction: Flow.PhaserNode;
  createItem: (p: {
    pos: Vector2;
  }) => (scene: Phaser.Scene) => Phaser.GameObjects.Sprite;
};

const skillAltar = (skillDef: SkillDef) => ({
  wp,
}: {
  wp: Wp.WpDef;
}): Flow.PhaserNode =>
  Npc.altarComponent({
    ...skillDef,
    wp,
    action: Flow.call(Def.scene.data.currentSkill.setValue(skillDef.key)),
  });

const arrowDef = declareGoInstance(arrowClass, "player-arrow");

const fireArrow = (targetPos: Vector2): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    Def.scene.data.skillPointerActive.setValue(false)(scene);
    const arrowObj = scene.physics.add.existing(
      arrowDef
        .create(
          createSpriteAt(
            scene,
            getObjectPosition(Def.player.getObj(scene)),
            "menu",
            "magic-arrow",
          ),
        )
        .setDepth(Def.depths.floating)
        .setScale(0.1),
    ) as Phaser.Physics.Arcade.Sprite;
    scene.physics.moveTo(arrowObj, targetPos.x, targetPos.y, 800);
    arrowObj.rotation = arrowObj.body.velocity.angle() - (Math.PI / 4) * 3;
    const zoomTween = scene.add.tween({
      targets: arrowObj,
      props: { scale: 0.7 },
      duration: 200,
    });
    const backAngle =
      Phaser.Math.RadToDeg(arrowObj.body.velocity.angle()) + 180;
    const particleAngleSpread = 40;
    const lightParticles = scene.add
      .particles("npc", "light-particle", {
        follow: arrowObj,
        speed: 300,
        quantity: 1,
        angle: {
          min: Phaser.Math.Angle.WrapDegrees(backAngle - particleAngleSpread),
          max: Phaser.Math.Angle.WrapDegrees(backAngle + particleAngleSpread),
        },
        lifespan: 400,
        scale: { start: 0.6, end: 0.1, ease: "Cubic.In" },
        alpha: { start: 0.6, end: 0 },
        tint: 0xffef42,
      })
      .setDepth(Def.depths.floating);
    const explodeArrow: Flow.PhaserNode = Flow.sequence(
      Flow.call(() => {
        arrowObj.body.stop();
        zoomTween.stop();
        lightParticles.emitters.each((emitter) => emitter.stop());
      }),
      Flow.tween({
        targets: arrowObj,
        props: { scale: 0 },
        delay: 100,
        duration: 300,
      }),
      Flow.call(() => {
        arrowObj.destroy();
        lightParticles.destroy();
      }),
    );
    return Flow.withBackground({
      main: Flow.sequence(
        Flow.wait(arrowDef.events.explodeArrow.subject),
        explodeArrow,
      ),
      back: Flow.parallel(
        Flow.observe(
          Flow.arcadeOverlapSubject({
            object1: Def.scene.data.interactableGroup.value(scene),
            object2: arrowObj,
          }),
          ({ getObjects }) =>
            Flow.call((scene) =>
              getObjects().forEach((object) =>
                Def.interactableEvents.hitPhysical(object.name).emit({})(scene),
              ),
            ),
        ),
        Flow.observe(
          Flow.arcadeColliderSubject({
            object1: Def.scene.data.wallGroup.value(scene),
            object2: arrowObj,
          }),
          () => Flow.call(arrowDef.events.explodeArrow.emit({})),
        ),
        Flow.sequence(
          Flow.waitTimer(1000),
          Flow.call(arrowDef.events.explodeArrow.emit({})),
        ),
      ),
    });
  });

const arrowUseAction: Flow.PhaserNode = Flow.lazy((scene) =>
  arrowDef.getObj(scene)
    ? Flow.noop
    : Flow.sequence(
        Flow.call(Def.scene.data.skillPointerActive.setValue(true)),
        Flow.observe(
          commonInputEvents.pointerdown.subject(scene).pipe(
            first(),
            map(({ pointer }) =>
              fireArrow(new Vector2(pointer.worldX, pointer.worldY)),
            ),
          ),
        ),
      ),
);
const arrowSkillDef: SkillDef = {
  key: "arrow-skill",
  createItem: ({ pos }) => (scene) =>
    createSpriteAt(scene, pos, "menu", "magic-arrow"),
  useAction: arrowUseAction,
};

const skillDefs = [arrowSkillDef];

export const arrowSkillAltar = skillAltar(arrowSkillDef);

export const skillsFlow: Flow.PhaserNode = Flow.lazy((scene) => {
  const hasThisSkill = (key: string): SceneContext<Observable<boolean>> => (
    scene,
  ) =>
    Def.scene.data.currentSkill
      .dataSubject(scene)
      .pipe(map((currentSkill) => currentSkill === key));
  return Flow.parallel(
    ...skillDefs.map((skillDef) =>
      bindSkillButton(hasThisSkill(skillDef.key)(scene), {
        key: skillDef.key,
        create: skillDef.createItem,
        action: skillDef.useAction,
      }),
    ),
  );
});
