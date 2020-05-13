import * as Phaser from "phaser";
import _ from "lodash";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";

import Vector2 = Phaser.Math.Vector2;
import { createSpriteAt, vecToXY } from "/src/helpers/phaser";
import { makeDataHelper } from "/src/helpers/data";

const createPlayer = (scene: Phaser.Scene) => {
  const wpHelper = Wp.wpSceneHelper(scene);
  const initialWp: Wp.WpDef = { room: 4, x: 2, y: 4 };
  const player = createSpriteAt(
    scene,
    Wp.wpPos(initialWp),
    "npc",
    "player-still",
  );
  const currentPosition = makeDataHelper<Wp.WpId>(player, "current-pos");
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
  }

  create() {
    const wpHelper = Wp.wpSceneHelper(this);
    const playerSetup = createPlayer(this);
    wpHelper.placeWps(playerSetup);
    playerSetup.initPlayer();
  }
}
