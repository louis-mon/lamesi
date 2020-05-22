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
import { annotate } from "/src/helpers/typing";
import { defineGoClass, declareGoInstance } from "/src/helpers/component";

const createPlayer = (scene: Phaser.Scene) => {
  const initialWp: Wp.WpDef = { room: 5, x: 0, y: 3 };
  const player = Def.player.create(
    createSpriteAt(scene, Wp.wpPos(initialWp), "npc", "player-still").setDepth(
      Def.depths.npc,
    ),
  );
  const currentPosData = Def.player.data.currentPos;
  const isMovingData = Def.player.data.isMoving;
  const setPlayerWp = (wp: Wp.WpId) => {
    currentPosData.setValue(wp)(scene);
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
  setPlayerWp(Wp.getWpId(initialWp));
  isMovingData.setValue(false)(scene);
  return Flow.parallel(
    Flow.observe(Def.scene.events.movePlayer.subject, ({ path }) => {
      if (isMovingData.value(scene)) return Flow.noop;
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
  );
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
  const rotateMechClass = defineGoClass({
    events: {},
    data: {
      turn: annotate<number>(),
    },
    kind: annotate<Phaser.GameObjects.Image>(),
  });
  const getRotateMechDef = (switchKey: string) =>
    declareGoInstance(rotateMechClass, `${switchKey}-rotate-mech`);
  const totalTurns = 6;
  const turnAngle = 360 / totalTurns;
  const getRotateMechAngle = (i: number) => turnAngle * i;
  const switchFlows = mechanisms.map(({ switchDef, startTurn }, i) => {
    Npc.switchCrystalFactory(scene)(switchDef);
    const rotateDef = getRotateMechDef(switchDef.key);
    const rotateObj = rotateDef.create(
      createImageAt(
        scene,
        Wp.wpPos({ room: 5, x: 2, y: 2 }),
        "npc",
        `symbol-circle-${i + 1}`,
      )
        .setDepth(Def.depths.carpet)
        .setAngle(getRotateMechAngle(startTurn)),
    );
    const turnData = rotateDef.data.turn;
    turnData.setValue(startTurn)(scene);
    const state = switchDef.data.state;

    return Flow.parallel(
      Flow.observe(turnData.subject, (turn) =>
        Flow.sequence(
          Flow.rotateTween({
            targets: rotateObj,
            duration: 400,
            props: { angle: getRotateMechAngle(turn) },
          }),
          Flow.call(state.setValue(false)),
        ),
      ),
      Flow.repeatWhen({
        condition: state.subject,
        action: Flow.call(turnData.updateValue((v) => v + 1)),
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
    const playerFlow = createPlayer(this);
    const switchFactory = Npc.switchCrystalFactory(this);
    const doorFactory = Npc.doorFactory(this);

    Npc.createNpcAnimations(this);
    Wp.placeWps(this);

    switchFactory(Def.switches.room4ForRoom5Door);
    doorFactory();

    Flow.run(
      this,
      Flow.parallel(
        playerFlow,
        Wp.wpsAction,
        Flow.when({
          condition: Def.switches.room4ForRoom5Door.data.state.subject,
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
