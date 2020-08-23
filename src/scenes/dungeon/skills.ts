import * as Phaser from "phaser";
import { Maybe } from "purify-ts";
import { playerCannotActSubject } from "./definitions";
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
  particleEmitterManagerClassKind,
  spriteClassKind,
} from "/src/helpers/component";
import { annotate } from "/src/helpers/typing";
import { take, map, tap, first } from "rxjs/operators";
import { of, Observable, combineLatest } from "rxjs";
import { combineContext } from "/src/helpers/functional";
import { bindSkillButton } from "./menu";

const arrowLightParticleDef = declareGoInstance(
  particleEmitterManagerClassKind,
  "arrow-particles",
);

const bellParticlesDef = declareGoInstance(
  particleEmitterManagerClassKind,
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
    infinite: true,
    wp,
    action: Flow.call(
      combineContext(
        Def.scene.data.currentSkillInUse.setValue(false),
        Def.scene.data.currentSkill.setValue(skillDef.key),
      ),
    ),
  });

const arrowDef = declareGoInstance(arrowClass, "player-arrow");

const fireArrow = (targetPos: Vector2): Flow.PhaserNode =>
  Flow.lazy((scene) => {
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
    const emitter = lightParticles.createEmitter({
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
        emitter.stop();
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
        Flow.concurrent(
          Flow.when({
            condition: Def.player.data.cannotAct.subject,
            action: Flow.noop,
          }),
          Flow.observe(
            commonInputEvents.pointerdown.subject(scene).pipe(
              first(),
              map(({ pointer }) =>
                Flow.call(
                  Def.scene.events.sendMagicArrow.emit(
                    new Vector2(pointer.worldX, pointer.worldY),
                  ),
                ),
              ),
            ),
          ),
        ),
        Flow.call(Def.scene.data.skillPointerActive.setValue(false)),
      ),
);

const arrowSkillDef: SkillDef = {
  key: "arrow-skill",
  createItem: ({ pos }) => (scene) =>
    createSpriteAt(scene, pos, "menu", "magic-arrow"),
  useAction: arrowUseAction,
};

const bellUseAction: Flow.PhaserNode = Flow.lazy((scene) => {
  if (Def.scene.data.currentSkillInUse.value(scene)) return Flow.noop;
  const particles = bellParticlesDef.getObj(scene);
  const player = Def.player.getObj(scene);
  const radius = { r: 30 };
  const emitter = particles.createEmitter({
    speed: 20,
    x: player.x,
    y: player.y,
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
  Def.scene.data.currentSkillInUse.setValue(true)(scene);
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
    Flow.call(() => emitter.stop()),
    Flow.call(Def.scene.data.currentSkillInUse.setValue(false)),
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
    const zoneScale = 0.8;
    const updateAlpha: Phaser.Types.GameObjects.Particles.EmitterOpOnUpdateCallback = (
      p,
      k,
      t,
    ) => Phaser.Math.Interpolation.Bezier([0, 1, 0.5], t);
    const emitter = bellParticlesDef.getObj(scene).createEmitter({
      scale: {
        start: 0.5,
        end: 0,
      },
      lifespan: 3000,
      alpha: updateAlpha,
      tint: { onEmit: () => new Phaser.Display.Color().random(128).color },
      quantity: 1,
      frequency: 450,
      emitZone: {
        type: "random",
        source: new Phaser.Geom.Rectangle(
          -Wp.wpHalfSize.x * zoneScale,
          -Wp.wpHalfSize.y * zoneScale,
          Wp.wpSize.x * zoneScale,
          Wp.wpSize.y * zoneScale,
        ),
      },
      x,
      y,
    });
    return Flow.sequence(
      Flow.wait(Def.bellHitEvent(Wp.getWpId(wp)).subject),
      Flow.call(() => emitter.remove()),
      action({ wp }),
    );
  });

const bellSkillDef: SkillDef = {
  key: "bell-skill",
  createItem: ({ pos }) => (scene) =>
    createSpriteAt(scene, pos, "menu", "bell"),
  useAction: bellUseAction,
};

const amuletShieldInst = declareGoInstance(spriteClassKind, "amulet-shield");

const deactivateAmulet: Flow.PhaserNode = Flow.call((scene) => {
  Maybe.fromNullable(amuletShieldInst.getObj(scene)).ifJust((shield) =>
    shield.destroy(),
  );
});

const activateAmulet: Flow.PhaserNode = Flow.lazy((scene) => {
  const playerObj = Def.player.getObj(scene);
  const shield = scene.physics.add.existing(
    amuletShieldInst
      .create(
        createSpriteAt(
          scene,
          getObjectPosition(playerObj),
          "npc",
          "symbol-circle-1",
        ),
      )
      .setDepth(Def.depths.floating)
      .setScale(0.5),
  ) as Phaser.Physics.Arcade.Sprite;
  shield.body.isCircle = true;
  Def.scene.data.shieldGroup.value(scene).add(shield);
  return Flow.parallel(
    Flow.when({
      condition: Def.player.data.isMoving.subject,
      action: deactivateAmulet,
    }),
    Flow.when({
      condition: Def.player.data.isDead.subject,
      action: deactivateAmulet,
    }),
  );
});

const amuletUseAction: Flow.PhaserNode = Flow.lazy((scene) => {
  return amuletShieldInst.getObj(scene) ? deactivateAmulet : activateAmulet;
});

export const amuletSkillDef: SkillDef = {
  key: "amulet-skill",
  createItem: ({ pos }) => (scene) =>
    createSpriteAt(scene, pos, "npc", "amulet"),
  useAction: amuletUseAction,
};

const skillDefs = [arrowSkillDef, bellSkillDef, amuletSkillDef];

export const arrowSkillAltar = skillAltar(arrowSkillDef);
export const bellSkillAltar = skillAltar(bellSkillDef);
export const amuletSkillAltar = skillAltar(amuletSkillDef);

export const skillsFlow: Flow.PhaserNode = Flow.lazy((scene) => {
  const hasThisSkill = (key: string): SceneContext<Observable<boolean>> => (
    scene,
  ) =>
    Def.scene.data.currentSkill
      .dataSubject(scene)
      .pipe(map((currentSkill) => currentSkill === key));
  return Flow.parallel(
    Flow.observe(Def.scene.events.sendMagicArrow.subject, fireArrow),
    ...skillDefs.map((skillDef) =>
      bindSkillButton(hasThisSkill(skillDef.key)(scene), {
        key: skillDef.key,
        create: skillDef.createItem,
        action: skillDef.useAction,
        disabled: combineLatest([
          playerCannotActSubject(scene),
          Def.player.data.isMoving.dataSubject(scene),
        ]).pipe(map(([cannotAct, isMoving]) => cannotAct || isMoving)),
      }),
    ),
  );
});
