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
import _ from "lodash";
import * as Phaser from "phaser";
import { map } from "rxjs/operators";
import * as Def from "./definitions";
import * as Wp from "./wp";
import * as Npc from "./npc";
import Vector2 = Phaser.Math.Vector2;
import { getProp } from "/src/helpers/functional";
import { followObject } from "/src/helpers/animate/composite";

export const iceArmorAltar = Npc.altarComponent({
  wp: { room: 4, x: 2, y: 3 },
  createItem: (p) => (scene) =>
    createSpriteAt(scene, p.pos, "menu", "ice-armor"),
  key: "ice-armor-altar",
  action: Flow.lazy((scene) => {
    const armor = createSpriteAt(scene, new Vector2(), "menu", "ice-armor")
      .setDepth(Def.depths.npcHigh)
      .setScale(0.3);
    return followObject({
      source: Def.player.getObj,
      target: () => armor,
      offset: new Vector2(),
    });
  }),
});
