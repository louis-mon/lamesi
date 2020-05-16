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
    Flow.execute(
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
