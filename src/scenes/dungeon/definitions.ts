import _ from "lodash";
import * as Phaser from "phaser";
import { defineGoKeys } from "/src/helpers/data";
import { annotate, ValueOf } from "/src/helpers/typing";

import Vector2 = Phaser.Math.Vector2;

export type WpId = string & { __wpIdTag: null };
export type WpDef = { room: number; x: number; y: number };

export const player = defineGoKeys<Phaser.GameObjects.Sprite>("player")({
  data: {
    currentPos: annotate<WpId>(),
    isMoving: annotate<boolean>(),
  },
});

const switchCrystalDef = (id: string) =>
  defineGoKeys<Phaser.GameObjects.Sprite>(`switch-${id}`)({
    data: { state: annotate<boolean>() },
  });

type ObjectNextWp = {
  wp: WpDef;
  offset: Vector2;
};
const switchesFromObject = <O extends { [k: string]: ObjectNextWp }>(o: O) =>
  _.mapValues(o, (val, key) => ({
    ...val,
    ...defineGoKeys(`switch-${key}`)({ data: { state: annotate<boolean>() } }),
  }));

export const switches = switchesFromObject({
  room5Rotate1: { wp: { room: 5, x: 0, y: 4 }, offset: new Vector2(0, 20) },
  room5Rotate2: { wp: { room: 5, x: 1, y: 4 }, offset: new Vector2(0, 20) },
  room5Rotate3: { wp: { room: 5, x: 2, y: 4 }, offset: new Vector2(0, 20) },
  room4ForRoom5Door: {
    wp: { room: 4, x: 4, y: 3 },
    offset: new Vector2(25, 0),
  },
});
export type SwitchCrystalDef = ValueOf<typeof switches>;

export const depths = {
  carpet: 1,
  wp: 5,
  npc: 10,
};
