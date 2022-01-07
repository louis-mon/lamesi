import * as Phaser from "phaser";
import { Maybe } from "purify-ts";
import { playerCannotActSubject } from "../definitions";
import * as Wp from "../wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as Geom from "/src/helpers/math/geom";
import * as Npc from "../npc";
import * as Def from "../definitions";
import { iceArmorAltar } from "../ice-armor";
import { globalData } from "../../common/global-data";
import { amuletSkillAltar } from "../skills";
import { createSpriteAt, SceneContext, vecToXY } from "/src/helpers/phaser";
import {
  declareGoInstance,
  defineGoSprite,
  defineSceneClass,
  spriteClassKind,
} from "/src/helpers/component";
import { annotate } from "/src/helpers/typing";
import { Observable } from "rxjs";
import { moveTo } from "/src/helpers/animate/move";

export const goal4Class = defineSceneClass({
  events: {},
  data: {},
});

type GreenFlameConfig = {
  pos: Wp.WpDef;
  hintFrame: string;
  nextPos: Wp.WpDef;
};

const greenFlameClass = defineGoSprite({
  events: {},
  data: {
    currentPos: annotate<Wp.WpDef>(),
    solved: annotate<boolean>(),
  },
});

const flameAnimKey = "flame-anim";
export const createFlameAnim = (scene: Phaser.Scene) =>
  scene.anims.create({
    key: flameAnimKey,
    frames: scene.anims.generateFrameNames("npc", {
      prefix: "flame-",
      start: 0,
      end: 3,
    }),
    duration: 1000,
    repeat: -1,
  });

export const makeGreenFlame = (config: GreenFlameConfig) => {
  const instance = declareGoInstance(greenFlameClass, null);
  const hintInstance = declareGoInstance(spriteClassKind, null);

  return {
    instance,
    hintInstance,
    config,
  };
};

export const showGreenFlame = ({
  instance,
  hintInstance,
  config,
}: ReturnType<typeof makeGreenFlame>): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const createHint: Flow.PhaserNode = Flow.call((scene) =>
      hintInstance.create(
        createSpriteAt(scene, Wp.wpPos(config.pos), "npc", config.hintFrame)
          .setDepth(Def.depths.carpet)
          .setAlpha(0)
          .setScale(0.4),
      ),
    );

    const flame = createSpriteAt(scene, Wp.wpPos(config.pos), "npc", "flame-0")
      .setDepth(Def.depths.floating)
      .setScale(0.1);
    instance.create(flame);
    flame.anims.play(flameAnimKey);
    return Flow.sequence(
      Flow.parallel(
        Flow.tween({ targets: flame, props: { scale: 2 } }),
        Flow.call(instance.data.currentPos.setValue(config.pos)),
        Flow.call(instance.data.solved.setValue(false)),
      ),
      Flow.waitTrue(playerIsOnFlame(instance)),
      Flow.parallel(
        moveFlameTo({ instance, newPos: config.nextPos }),
        Flow.sequence(
          createHint,
          Flow.tween(() => ({
            targets: hintInstance.getObj(scene),
            props: { alpha: 1 },
          })),
        ),
      ),
    );
  });

type GreenFlameInst = ReturnType<typeof makeGreenFlame>["instance"];

export const moveFlameTo = ({
  newPos,
  instance,
}: {
  newPos: Wp.WpDef;
  instance: GreenFlameInst;
}): Flow.PhaserNode =>
  Flow.sequence(
    moveTo((scene) => ({
      target: instance.getObj(scene),
      dest: Wp.wpPos(newPos),
      speed: 0.3,
    })),
    Flow.call(instance.data.currentPos.setValue(newPos)),
  );

export const playerIsOnFlame =
  (instance: GreenFlameInst): SceneContext<Observable<boolean>> =>
  (scene) =>
    Def.playerIsOnPos(instance.data.currentPos.value(scene))(scene);

export const hintFlameRoom5 = makeGreenFlame({
  pos: { room: 4, x: 3, y: 4 },
  hintFrame: "hint-fish",
  nextPos: { room: 5, x: 3, y: 4 },
});
export const hintFlameRoom3 = makeGreenFlame({
  pos: { room: 4, x: 1, y: 4 },
  hintFrame: "hint-hourglass",
  nextPos: { room: 3, x: 1, y: 1 },
});
