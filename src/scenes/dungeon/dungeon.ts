import { dungeonGoal3 } from "/src/scenes/dungeon/goal-3";
import { createPlayer } from "/src/scenes/dungeon/player";
import { eventsHelpers } from "/src/scenes/global-events";
import * as Phaser from "phaser";
import _ from "lodash";
import { playerCannotActSubject } from "./definitions";
import { getWpId } from "./wp";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as Def from "./definitions";

import Vector2 = Phaser.Math.Vector2;
import {
  createSpriteAt,
  vecToXY,
  createImageAt,
  placeAt,
  addPhysicsFromSprite,
} from "/src/helpers/phaser";
import * as Npc from "./npc";
import { makeMenu } from "./menu";
import { subWordGameBeginEvent, gameWidth, gameHeight } from "../common";
import { annotate } from "/src/helpers/typing";
import {
  defineGoClass,
  declareGoInstance,
  customEvent,
} from "/src/helpers/component";
import { combineContext } from "/src/helpers/functional";
import { combineLatest } from "rxjs";
import { map } from "rxjs/operators";
import {
  initSkills,
  skillsFlow,
  arrowSkillAltar,
  bellSkillAltar,
  amuletSkillAltar,
} from "./skills";
import { dungeonGoal2 } from "./goal-2";
import { dungeonGoal1 } from "./goal-1";
import { dragon } from "./dragon";

export class DungeonScene extends Phaser.Scene {
  constructor() {
    super({
      key: "dungeon",
      loader: {
        path: "assets/dungeon",
      },
    });
  }

  preload() {
    this.load.atlas("npc");
    this.load.atlas("menu");
    this.load.atlas("dragon");
    this.load.image("rooms");
  }

  create() {
    const playerFlow = createPlayer(this);

    Npc.initNpc(this);
    Wp.initGroundMap(this);
    Npc.createDoors(this);

    const initActions = Flow.sequence(initSkills);

    const debugActions = Flow.parallel(
      Npc.openDoor("door4To3"),
      Npc.openDoor("door5To2"),
      Npc.openDoor("door4To1"),
      arrowSkillAltar({ wp: { room: 4, x: 1, y: 4 } }),
      bellSkillAltar({ wp: { room: 4, x: 3, y: 4 } }),
      amuletSkillAltar({ wp: { room: 4, x: 2, y: 3 } }),
    );

    const ambientActions = Flow.parallel(
      playerFlow,
      Wp.wpsAction,
      skillsFlow,
      dungeonGoal1,
      dungeonGoal2,
      dungeonGoal3,
      debugActions,
      dragon,
    );
    Flow.run(this, Flow.sequence(initActions, ambientActions));
    this.events.once(subWordGameBeginEvent, () => {
      makeMenu(this);
    });
  }

  update() {
    this.children.sort("y", (obj1: any, obj2: any) =>
      obj1.depth === obj2.depth ? obj1.y > obj2.y : obj1.depth > obj2.depth,
    );
  }
}
