import { dungeonGoal3 } from "/src/scenes/dungeon/goal-3";
import * as Phaser from "phaser";
import _ from "lodash";
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
} from "./skills";
import { dungeonGoal2 } from "./goal-2";
import { dungeonGoal1 } from "./goal-1";
import { dragon } from "./dragon";

const createPlayer = (scene: Phaser.Scene) => {
  const initialWp: Wp.WpDef = { room: 4, x: 2, y: 4 };
  const player = addPhysicsFromSprite(
    scene,
    Def.player.create(
      createSpriteAt(
        scene,
        Wp.wpPos(initialWp),
        "npc",
        "player-still",
      ).setDepth(Def.depths.npc),
    ),
  );
  const currentPosData = Def.player.data.currentPos;
  const isMovingData = Def.player.data.isMoving;
  const isDeadData = Def.player.data.isDead;
  const setPlayerWp = (wp: Wp.WpId) => {
    currentPosData.setValue(wp)(scene);
  };
  const playerSpeed = 0.3;
  scene.anims.create({
    key: "walk",
    repeat: -1,
    duration: 500,
    frames: scene.anims.generateFrameNames("npc", {
      start: 1,
      end: 2,
      prefix: "player-move-",
      zeroPad: 2,
    }),
  });
  Def.scene.data.playerCheckpoint.setValue(getWpId(initialWp))(scene);
  setPlayerWp(Wp.getWpId(initialWp));
  isMovingData.setValue(false)(scene);
  return Flow.parallel(
    Flow.observe(Def.scene.events.movePlayer.subject, ({ path }) => {
      if (isMovingData.value(scene) || isDeadData.value(scene))
        return Flow.noop;
      isMovingData.setValue(true)(scene);
      player.anims.play("walk");
      return Flow.sequence(
        ...path.map((wpId) => {
          const wpPos = Wp.wpPos(Wp.getWpDef(wpId));
          return Flow.lazy(() =>
            Flow.sequence(
              Flow.tween({
                targets: player,
                props: vecToXY(wpPos),
                duration:
                  wpPos.distance(
                    Wp.wpPos(Wp.getWpDef(currentPosData.value(scene))),
                  ) / playerSpeed,
              }),
              Flow.call(() => setPlayerWp(wpId)),
            ),
          );
        }),
        Flow.call(() => {
          player.anims.stop();
          player.setFrame("player-still");
          isMovingData.setValue(false)(scene);
        }),
      );
    }),
    Flow.observe(Def.scene.events.killPlayer.subject, () => {
      if (isDeadData.value(scene)) return Flow.noop;
      isDeadData.setValue(true)(scene);
      return Flow.sequence(
        Flow.waitTimer(2000),
        Flow.call(() => {
          const newPosId = Def.scene.data.playerCheckpoint.value(scene);
          setPlayerWp(newPosId);
          placeAt(player, Wp.wpPos(Wp.getWpDef(newPosId)));
        }),
        Flow.call(isDeadData.setValue(false)),
      );
    }),
  );
};

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
    );

    const ambiantActions = Flow.parallel(
      playerFlow,
      Wp.wpsAction,
      skillsFlow,
      dungeonGoal1,
      dungeonGoal2,
      dungeonGoal3,
      debugActions,
      dragon,
    );
    Flow.run(this, Flow.sequence(initActions, ambiantActions));
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
