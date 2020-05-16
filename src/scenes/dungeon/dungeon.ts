import * as Phaser from "phaser";
import _ from "lodash";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as def from "./definitions";

import Vector2 = Phaser.Math.Vector2;
import { createSpriteAt, vecToXY, createImageAt } from "/src/helpers/phaser";
import * as Npc from "./npc";
import { makeMenu } from "./menu";
import { subWordGameBeginEvent } from "../common";
import { first, map, startWith } from "rxjs/operators";
import { defineGoKeys } from "/src/helpers/data";
import { annotate } from "/src/helpers/typing";
import { number } from "purify-ts";

const createPlayer = (scene: Phaser.Scene) => {
  const wpHelper = Wp.wpSceneHelper(scene);
  const initialWp: Wp.WpDef = { room: 5, x: 0, y: 3 };
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
    startMoveAction: Flow.call(() => player.anims.play("walk")),
    endMoveAction: Flow.call(() => {
      player.anims.stop();
      player.setFrame("player-still");
    }),
  };
};

const linkSwitchWithCircleSymbol = (scene: Phaser.Scene) => {
  const mechanisms = [
    {
      switchDef: def.switches.room5Rotate1,
    },
    {
      switchDef: def.switches.room5Rotate2,
    },
    {
      switchDef: def.switches.room5Rotate3,
    },
  ];
  const getRotateMechDef = (switchKey: string) =>
    defineGoKeys<Phaser.GameObjects.Image>(`${switchKey}-rotate-mech`)({
      turn: annotate<number>(),
    });
  const totalTurns = 6;
  const turnAngle = 360 / totalTurns;
  const getRotateMechAngle = (i: number) =>
    Phaser.Math.Angle.WrapDegrees(turnAngle * i);
  const switchFlows = mechanisms.map(({ switchDef }, i) => {
    Npc.switchCrystalFactory(scene)(switchDef);
    const rotateDef = getRotateMechDef(switchDef.key);
    const rotateObj = createImageAt(
      scene,
      Wp.wpPos({ room: 5, x: 2, y: 2 }),
      "npc",
      `symbol-circle-${i + 1}`,
    ).setName(rotateDef.key);
    const turnData = rotateDef.data.turn(scene);
    turnData.setValue(0);
    const state = switchDef.data.state(scene);

    const rotateTweens = (i: number) => {
      const targetAngle = getRotateMechAngle(i);
      const startAngle = rotateObj.angle;

      const duration = 400;
      if (startAngle <= targetAngle)
        return Flow.tween({
          targets: rotateObj,
          props: {
            angle: targetAngle,
          },
          duration,
        });
      return Flow.sequence(
        Flow.tween({
          targets: rotateObj,
          props: {
            angle: 180,
          },
          duration: Phaser.Math.Linear(0, 400, (180 - startAngle) / turnAngle),
        }),
        Flow.tween({
          targets: rotateObj,
          props: { angle: { getStart: () => -180, getEnd: () => targetAngle } },
          duration: Phaser.Math.Linear(0, 400, (targetAngle + 180) / turnAngle),
        }),
      );
    };

    return Flow.parallel(
      Flow.fromObservable(
        turnData.observe().pipe(
          map((turn) =>
            Flow.sequence(
              rotateTweens(turn),
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

    switchFactory(def.switches.room4ForRoom5Door);
    doorFactory();

    Flow.run(
      this,
      Flow.parallel(
        Flow.when({
          condition: def.switches.room4ForRoom5Door.data.state(this).observe(),
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
