import { createAllFlameThrowers } from "/src/scenes/dungeon/fireball";
import { dungeonGoal3 } from "/src/scenes/dungeon/goal-3";
import { createPlayer } from "/src/scenes/dungeon/player";
import { events, eventsHelpers } from "/src/scenes/global-events";
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
import { combineLatest, fromEvent } from "rxjs";
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
import { dragon, enableGoal5 } from "./dragon";
import { dungeonGoal4 } from "./goal-4/goal-4";
import { equipFireShield } from "./ice-armor";

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

    const cheatCodeAction: Flow.PhaserNode = Flow.whenTrueDo({
      condition: events.cheatCodes.dataSubject,
      action: Flow.lazy(() => {
        const activateAllKey = this.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes.PLUS,
        );
        return Flow.whenTrueDo({
          condition: fromEvent(activateAllKey, "down"),
          action: Flow.call(() =>
            [
              events.dungeonPhase1,
              events.dungeonPhase2,
              events.dungeonPhase3,
              events.dungeonPhase4,
            ].forEach((trigger) => trigger.setValue(true)(this)),
          ),
        });
      }),
    });

    const ambientActions = Flow.parallel(
      playerFlow,
      Wp.wpsAction,
      skillsFlow,
      equipFireShield,
      dragon,
      createAllFlameThrowers,
      dungeonGoal1,
      dungeonGoal2,
      dungeonGoal3,
      dungeonGoal4,
      enableGoal5,
      cheatCodeAction,
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
