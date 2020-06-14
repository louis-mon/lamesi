import * as Phaser from "phaser";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as Geom from "/src/helpers/math/geom";
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
  defineGoClassKind,
} from "/src/helpers/component";
import { annotate } from "/src/helpers/typing";
import { take, map, tap, first } from "rxjs/operators";
import { of, Observable } from "rxjs";
import { combineContext } from "/src/helpers/functional";
import { bindSkillButton } from "./menu";

const arrowLightParticleDef = declareGoInstance(
  defineGoClassKind<Phaser.GameObjects.Particles.ParticleEmitterManager>(),
  "arrow-particles",
);

const bellParticlesDef = declareGoInstance(
  defineGoClassKind<Phaser.GameObjects.Particles.ParticleEmitterManager>(),
  "bell-particles",
);

export const initSkills: Flow.PhaserNode = Flow.call((scene) => {
  Def.scene.data.currentSkill.setValue("")(scene);
  arrowLightParticleDef.create(
    scene.add.particles("npc", "light-particle").setDepth(Def.depths.floating),
  );
  bellParticlesDef.create(
    scene.add
      .particles("npc", "bell-hint-particle")
      .setDepth(Def.depths.floating),
  );
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
    const lightParticles = arrowLightParticleDef.getObj(scene);
    const emmitter = lightParticles.createEmitter({
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
    });
    const explodeArrow: Flow.PhaserNode = Flow.sequence(
      Flow.call(() => {
        arrowObj.body.stop();
        zoomTween.stop();
        emmitter.stop();
      }),
      Flow.tween({
        targets: arrowObj,
        props: { scale: 0 },
        delay: 100,
        duration: 300,
      }),
      Flow.call(() => {
        arrowObj.destroy();
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

const bellUseAction: Flow.PhaserNode = Flow.lazy((scene) => {
  const particles = bellParticlesDef.getObj(scene);
  const player = Def.player.getObj(scene);
  const radius = { r: 30 };
  const emmiter = particles.createEmitter({
    speed: 20,
    follow: player,
    scale: {
      start: 0.5,
      end: 0,
    },
    alpha: { start: 0.8, end: 0 },
    tint: { onEmit: () => new Phaser.Display.Color().random(128).color },
    quantity: 15,
    emitZone: {
      type: "random",
      source: {
        getRandomPoint(point: Vector2) {
          Phaser.Math.RandomXY(point, radius.r);
        },
      },
    },
  });
  const playerWp = Def.player.data.currentPos.value(scene);
  const playerWpDef = Wp.getWpDef(playerWp);
  return Flow.sequence(
    Flow.parallel(
      Flow.tween({
        targets: radius,
        props: { r: Wp.wpHalfSize.x * 3 },
        duration: 1200,
      }),
      Flow.sequence(
        Flow.waitTimer(500),
        Flow.call(Def.bellHitEvent(playerWp).emit({})),
        Flow.waitTimer(500),
        ...Geom.pointsAround(new Vector2(playerWpDef), 1).map((nwp) =>
          Flow.call(
            Def.bellHitEvent(
              Wp.getWpId({ ...nwp, room: playerWpDef.room }),
            ).emit({}),
          ),
        ),
      ),
    ),
    Flow.call(() => emmiter.stop()),
  );
});

export const bellHiddenAction = ({
  action,
  wp,
}: {
  action: (p: { wp: Def.WpDef }) => Flow.PhaserNode;
  wp: Def.WpDef;
}): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const { x, y } = Wp.wpPos(wp);
    const emitter = bellParticlesDef.getObj(scene).createEmitter({
      speed: 20,
      scale: {
        start: 0.5,
        end: 0,
      },
      lifespan: 3000,
      alpha: { start: 0.8, end: 0 },
      tint: { onEmit: () => new Phaser.Display.Color().random(128).color },
      quantity: 1,
      frequency: 800,
      emitZone: {
        type: "random",
        source: new Phaser.Geom.Rectangle(
          -Wp.wpHalfSize.x,
          -Wp.wpHalfSize.y,
          Wp.wpSize.x,
          Wp.wpSize.y,
        ),
      },
      x,
      y,
    });
    return Flow.sequence(
      Flow.wait(Def.bellHitEvent(Wp.getWpId(wp)).subject),
      Flow.call(() => emitter.stop()),
      action({ wp }),
    );
  });

const bellSkillDef: SkillDef = {
  key: "bell-skill",
  createItem: ({ pos }) => (scene) =>
    createSpriteAt(scene, pos, "menu", "bell"),
  useAction: bellUseAction,
};

const skillDefs = [arrowSkillDef, bellSkillDef];

export const arrowSkillAltar = skillAltar(arrowSkillDef);
export const bellSkillAltar = skillAltar(bellSkillDef);

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
