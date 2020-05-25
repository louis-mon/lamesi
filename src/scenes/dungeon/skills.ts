import * as Phaser from "phaser";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as Npc from "./npc";
import * as Def from "./definitions";

import Vector2 = Phaser.Math.Vector2;
import { createSpriteAt } from "/src/helpers/phaser";
import { tap } from "rxjs/operators";

export const initSkills: Flow.PhaserNode = Flow.call((scene) => {
  Def.scene.data.arrowAvailable.setValue(false)(scene);
  Def.scene.data.currentSkill.setValue("")(scene);
});

export const arrowSkill: Flow.PhaserNode = Flow.lazy((scene) => {
  return Flow.when({
    condition: Def.scene.data.arrowAvailable.subject,
    action: Npc.altarComponent({
      key: "arrow-skill",
      wp: { room: 5, x: 4, y: 0 },
      createItem: ({ pos }) => (scene) =>
        createSpriteAt(scene, pos, "menu", "magic-arrow"),
      action: Flow.call(() => console.log("arrow")),
    }).activateAltar,
  });
});
