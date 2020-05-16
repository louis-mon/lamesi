import * as Phaser from "phaser";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import { map, tap } from "rxjs/operators";

import * as def from "./definitions";

import Vector2 = Phaser.Math.Vector2;
import { createSpriteAt } from "/src/helpers/phaser";
import { bindActionButton } from "./menu";
import { combineLatest } from "rxjs";

export const createNpcAnimations = (scene: Phaser.Scene) => {
  scene.anims.create({
    key: "switch",
    duration: 500,
    frames: scene.anims.generateFrameNames("npc", {
      start: 0,
      end: 4,
      prefix: "switch-",
    }),
  });
};

type SwitchCrystalFactoryParams = {
  wp: Wp.WpDef;
  offset: Vector2;
  ref: def.SwitchCrystalDef;
};
export const switchCrystalFactory = (scene: Phaser.Scene) => {
  return ({ wp, offset, ref }: SwitchCrystalFactoryParams) => {
    const obj = createSpriteAt(
      scene,
      Wp.wpPos(wp).add(offset),
      "npc",
      "switch-0",
    ).setName(ref.key);
    const stateData = ref.data.state(scene);
    stateData.setValue(false);
    Flow.run(
      scene,
      Flow.withSentinel({
        sentinel: combineLatest([
          def.player.data
            .currentPos(scene)
            .observe()
            .pipe(map((pos) => pos === Wp.getWpId(wp))),
          stateData.observe(),
        ]).pipe(
          map(
            ([isPlayerAtPos, isSwitchActive]) =>
              isPlayerAtPos && !isSwitchActive,
          ),
        ),
        action: bindActionButton({
          action: Flow.sequence(
            Flow.call(() => obj.anims.play("switch")),
            Flow.waitForEvent({
              emitter: obj,
              event: "animationcomplete",
            }),
            Flow.call(() => stateData.updateValue((v) => !v)),
          ),
          frameKey: "action-attack",
        }),
      }),
    );
  };
};

const doorDef = {
  wp1: { room: 4, x: 4, y: 2 },
  wp2: { room: 5, x: 0, y: 2 },
  key: "door-4-5",
};

export const openDoor = (): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const door = scene.children.getByName(
      doorDef.key,
    ) as Phaser.GameObjects.Sprite;
    return Flow.sequence(
      Flow.tween({
        targets: door,
        props: { y: door.y - 100 },
      }),
      Flow.call(() =>
        Wp.openGraphLink(
          scene,
          Wp.getWpId(doorDef.wp1),
          Wp.getWpId(doorDef.wp2),
        ),
      ),
    );
  });

export const doorFactory = (scene: Phaser.Scene) => {
  return () => {
    const wp1 = Wp.wpPos(doorDef.wp1);
    const wp2 = Wp.wpPos(doorDef.wp2);
    const middlePos = wp1.clone().add(wp2).scale(0.5);
    const door1 = createSpriteAt(
      scene,
      middlePos,
      "npc",
      "door-vertical",
    ).setName(doorDef.key);
  };
};
