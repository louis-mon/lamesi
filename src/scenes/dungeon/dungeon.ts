import * as Phaser from "phaser";
import _ from "lodash";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as Def from "./definitions";

import Vector2 = Phaser.Math.Vector2;
import { createSpriteAt, vecToXY, createImageAt } from "/src/helpers/phaser";
import * as Npc from "./npc";
import { makeMenu } from "./menu";
import { subWordGameBeginEvent } from "../common";
import { map } from "rxjs/operators";
import { defineGoKeys } from "/src/helpers/data";
import { annotate } from "/src/helpers/typing";
import { number } from "purify-ts";

const createPlayer = (scene: Phaser.Scene) => {
  const wpHelper = Wp.wpSceneHelper(scene);
  const initialWp: Wp.WpDef = { room: 4, x: 2, y: 4 };
  const player = createSpriteAt(
    scene,
    Wp.wpPos(initialWp),
    "npc",
    "player-still",
  )
    .setName(Def.player.key)
    .setDepth(Def.depths.npc);
  const currentPosition = Def.player.data.currentPos(scene);
  const isMoving = Def.player.data.isMoving(scene);
  const setPlayerWp = (wp: Wp.WpId) => {
    currentPosition.setValue(wp);
  };
  const playerSpeed = 0.5;
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
      return Flow.lazy(() =>
        Flow.sequence(
          Flow.tween({
            targets: player,
            props: vecToXY(wpPos),
            duration:
              wpPos.distance(Wp.wpPos(Wp.getWpDef(currentPosition.value()))) /
              playerSpeed,
          }),
          Flow.call(() => setPlayerWp(wpId)),
        ),
      );
    },
    startMoveAction: Flow.call(() => {
      isMoving.setValue(true);
      player.anims.play("walk");
    }),
    endMoveAction: Flow.call(() => {
      player.anims.stop();
      player.setFrame("player-still");
      isMoving.setValue(false);
    }),
  };
};

const linkSwitchWithCircleSymbol = (scene: Phaser.Scene) => {
  const mechanisms = [
    {
      switchDef: Def.switches.room5Rotate1,
      startTurn: 2,
    },
    {
      switchDef: Def.switches.room5Rotate2,
      startTurn: 5,
    },
    {
      switchDef: Def.switches.room5Rotate3,
      startTurn: 3,
    },
  ];
  const getRotateMechDef = (switchKey: string) =>
    defineGoKeys<Phaser.GameObjects.Image>(`${switchKey}-rotate-mech`)({
      data: {
        turn: annotate<number>(),
      },
    });
  const totalTurns = 6;
  const turnAngle = 360 / totalTurns;
  const getRotateMechAngle = (i: number) => turnAngle * i;
  const switchFlows = mechanisms.map(({ switchDef, startTurn }, i) => {
    Npc.switchCrystalFactory(scene)(switchDef);
    const rotateDef = getRotateMechDef(switchDef.key);
    const rotateObj = createImageAt(
      scene,
      Wp.wpPos({ room: 5, x: 2, y: 2 }),
      "npc",
      `symbol-circle-${i + 1}`,
    )
      .setName(rotateDef.key)
      .setDepth(Def.depths.carpet)
      .setAngle(getRotateMechAngle(startTurn));
    const turnData = rotateDef.data.turn(scene);
    turnData.setValue(startTurn);
    const state = switchDef.data.state(scene);

    return Flow.parallel(
      Flow.fromObservable(
        turnData.observe().pipe(
          map((turn) =>
            Flow.sequence(
              Flow.rotateTween({
                targets: rotateObj,
                duration: 400,
                props: { angle: getRotateMechAngle(turn) },
              }),
              Flow.call(() => state.setValue(false)),
            ),
          ),
        ),
      ),
      Flow.whenLoop({
        condition: state.observe(),
        action: Flow.call(() => turnData.updateValue((v) => v + 1)),
      }),
    );
  });
  return Flow.parallel(...switchFlows);
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
    const switchFactory = Npc.switchCrystalFactory(this);
    const doorFactory = Npc.doorFactory(this);

    Npc.createNpcAnimations(this);
    wpHelper.placeWps(playerSetup);
    playerSetup.initPlayer();

    switchFactory(Def.switches.room4ForRoom5Door);
    doorFactory();

    Flow.run(
      this,
      Flow.parallel(
        Flow.when({
          condition: Def.switches.room4ForRoom5Door.data.state(this).observe(),
          action: Npc.openDoor(),
        }),
        linkSwitchWithCircleSymbol(this),
      ),
    );
    this.events.once(subWordGameBeginEvent, () => {
      makeMenu(this);
    });
  }
}
