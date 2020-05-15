import * as Phaser from "phaser";
import _ from "lodash";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as def from "./definitions";

import Vector2 = Phaser.Math.Vector2;
import { createSpriteAt, vecToXY } from "/src/helpers/phaser";
import { switchCrystalFactory } from "./npc";
import { makeMenu } from "./menu";
import { subWordGameBeginEvent } from "../common";

const createPlayer = (scene: Phaser.Scene) => {
  const wpHelper = Wp.wpSceneHelper(scene);
  const initialWp: Wp.WpDef = { room: 4, x: 2, y: 4 };
  const player = createSpriteAt(
    scene,
    Wp.wpPos(initialWp),
    "npc",
    "player-still",
  ).setName(def.player.key);
  const currentPosition = def.player.data.currentPos(scene);
  const setPlayerWp = (wp: Wp.WpId) => {
    currentPosition.setValue(wp);
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
  return {
    initPlayer: () => {
      setPlayerWp(Wp.getWpId(initialWp));
      wpHelper.isActive.setValue(true);
    },
    moveAction: (wpId: Wp.WpId) => {
      const wpPos = Wp.wpPos(Wp.getWpDef(wpId));
      return Flow.sequence(
        Flow.tween(() => ({
          targets: player,
          props: vecToXY(wpPos),
          duration:
            wpPos.distance(Wp.wpPos(Wp.getWpDef(currentPosition.value()))) /
            playerSpeed,
        })),
        Flow.call(() => setPlayerWp(wpId)),
      );
    },
    startMoveAction: Flow.call(() => player.anims.play("walk")),
    endMoveAction: Flow.call(() => {
      player.anims.stop();
      player.setFrame("player-still");
    }),
    currentPosition,
  };
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
  }

  create() {
    const wpHelper = Wp.wpSceneHelper(this);
    const playerSetup = createPlayer(this);
    const switchFactory = switchCrystalFactory(this);

    wpHelper.placeWps(playerSetup);
    playerSetup.initPlayer();

    switchFactory({
      wp: { room: 4, x: 4, y: 3 },
      offset: new Vector2(20, 0),
      action: Flow.call(() => console.log("bla")),
    });

    this.events.once(subWordGameBeginEvent, () => {
      makeMenu(this);
    });
  }
}
