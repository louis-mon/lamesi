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
  const currentPosition = makeDataHelper<Wp.WpDef>(player, "current-pos");
  const setPlayerWp = (wp: Wp.WpDef) => {
    currentPosition.setValue(wp);
  };
  const playerSpeed = 0.1;
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
      setPlayerWp(initialWp);
      wpHelper.isActive.setValue(true);
    },
    moveAction: (wp: Wp.WpDef) =>
      Flow.sequence(
        Flow.parallel(
          Flow.call(() => player.anims.play("walk")),
          Flow.tween(() => ({
            targets: player,
            props: vecToXY(Wp.wpPos(wp)),
            duration:
              Wp.wpPos(wp).distance(Wp.wpPos(currentPosition.value())) /
              playerSpeed,
          })),
        ),
        Flow.call(() => {
          player.anims.stop();
          player.setFrame("player-still");
          setPlayerWp(wp);
        }),
      ),
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
