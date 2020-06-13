import _ from "lodash";
import * as Phaser from "phaser";
import { annotate, ValueOf } from "/src/helpers/typing";

import Vector2 = Phaser.Math.Vector2;
import {
  defineSceneClass,
  defineGoClass,
  declareGoInstance,
  declareGoInstances,
  customEvent,
  defineEvents,
} from "/src/helpers/component";

export type WpId = string & { __wpIdTag: null };
export type WpDef = { room: number; x: number; y: number };
export type WpGraph = { [key: string]: { links: WpId[] } };

export const scene = defineSceneClass({
  data: {
    // pointer input request active for special situations like arrow destination
    skillPointerActive: annotate<boolean>(),
    wpGraph: annotate<WpGraph>(),
    currentSkill: annotate<string>(),
    interactableGroup: annotate<Phaser.Physics.Arcade.Group>(),
    wallGroup: annotate<Phaser.Physics.Arcade.StaticGroup>(),
  },
  events: {
    movePlayer: customEvent<{ path: WpId[] }>(),
  },
});

export const playerClass = defineGoClass({
  data: {
    currentPos: annotate<WpId>(),
    isMoving: annotate<boolean>(),
  },
  events: {},
  kind: annotate<Phaser.GameObjects.Sprite>(),
});

export const player = declareGoInstance(playerClass, "player");

export const interactableEvents = defineEvents(
  {
    hitPhysical: customEvent(),
  },
  "go",
);

type ObjectNextWp = {
  wp: WpDef;
  offset: Vector2;
};
export const switchClass = defineGoClass({
  data: { state: annotate<boolean>() },
  events: { activateSwitch: customEvent(), deactivateSwitch: customEvent() },
  kind: annotate<Phaser.GameObjects.Sprite>(),
  config: annotate<ObjectNextWp & { deactivable?: boolean }>(),
});

export const switches = declareGoInstances(switchClass, "switch", {
  room5Rotate1: { wp: { room: 5, x: 0, y: 4 }, offset: new Vector2(-20, 5) },
  room5Rotate2: { wp: { room: 5, x: 1, y: 4 }, offset: new Vector2(-20, 5) },
  room5Rotate3: { wp: { room: 5, x: 2, y: 4 }, offset: new Vector2(-20, 5) },
  room4ForRoom5Door: {
    wp: { room: 4, x: 4, y: 3 },
    offset: new Vector2(25, 0),
  },
  room5ForRoom4Door: {
    wp: { room: 5, x: 0, y: 0 },
    offset: new Vector2(-20, -10),
  },
  goal1Left: {
    wp: { room: 4, x: 0, y: 0 },
    offset: new Vector2(-20, 0),
  },
  goal1Right: {
    wp: { room: 4, x: 4, y: 0 },
    offset: new Vector2(20, 0),
  },
});
export type SwitchCrystalDef = ValueOf<typeof switches>;

export const depths = {
  backgound: -10,
  carpet: 1,
  wp: 5,
  npc: 10,
  floating: 15,
};
