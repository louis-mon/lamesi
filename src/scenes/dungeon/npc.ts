import * as Phaser from "phaser";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import { map } from "rxjs/operators";

import * as def from "./definitions";

import Vector2 = Phaser.Math.Vector2;
import { createSpriteAt } from "/src/helpers/phaser";
import { bindActionButton } from "./menu";

type MakeCrystalSwitchParam = {
  wp: Wp.WpDef;
  offset: Vector2;
  action: Flow.PhaserNode;
};
export const switchCrystalFactory = (scene: Phaser.Scene) => {
  return ({ wp, offset, action }: MakeCrystalSwitchParam) => {
    const obj = createSpriteAt(
      scene,
      Wp.wpPos(wp).add(offset),
      "npc",
      "switch-0",
    );
    Flow.execute(
      scene,
      Flow.withSentinel({
        sentinel: () =>
          def.player.data
            .currentPos(scene)
            .observe()
            .pipe(
              map((pos) => pos === Wp.getWpId(wp)),
            ),
        action: bindActionButton({
          action,
          frameKey: "action-attack",
        }),
      }),
    );
  };
};
