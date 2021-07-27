import Phaser from "phaser";

import {
  createImageAt,
  createSpriteAt,
  getObjectPosition,
  placeAt,
} from "/src/helpers/phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { declareGoInstance } from "/src/helpers/component";
import { getProp } from "/src/helpers/functional";
import * as Def from "./def";
import _ from "lodash";
import { Maybe } from "purify-ts";
import { MovedCurve } from "/src/helpers/math/curves";
import { makeControlledValue } from "/src/helpers/animate/tween";
import Vector2 = Phaser.Math.Vector2;
import {
  followObject,
  followPosition,
  followRotation,
} from "/src/helpers/animate/composite";
import { AlgaeController, createAlgae } from "/src/scenes/creatures/algae";

type EggRockState = {
  obj: Phaser.GameObjects.Image;
  algae: AlgaeController | null;
  bloomFlow: Flow.SceneStatesFlow;
  algaeAngle: number;
};

type ShellRockState = {
  belowObj: Phaser.GameObjects.Image;
  aboveObj: Phaser.GameObjects.Image;
};

type RockState = {
  eggs: EggRockState[];
  shells: ShellRockState[];
};

const initializeState = (scene: Phaser.Scene): RockState => {
  const state: RockState = { eggs: [], shells: [] };
  const createEgg = ({
    pos,
    algaeAngle,
  }: {
    pos: Vector2;
    algaeAngle: number;
  }) => {
    const newEgg = scene.add
      .image(pos.x, pos.y, "rocks", "egg")
      .setInteractive();
    state.eggs.push({
      obj: newEgg,
      algae: null,
      bloomFlow: Flow.makeSceneStates(),
      algaeAngle,
    });
  };
  const createShell = ({ pos }: { pos: Vector2 }) => {
    const newShell = scene.add
      .image(pos.x, pos.y, "rocks", "shell-2")
      .setOrigin(0.5, 0);
    const newShellAbove = scene.add
      .image(pos.x, pos.y, "rocks", "shell-1")
      .setOrigin(0.5, 0)
      .setInteractive();
    state.shells.push({ belowObj: newShell, aboveObj: newShellAbove });
  };

  createEgg({ pos: new Vector2(1400, 430), algaeAngle: -148 });
  createEgg({ pos: new Vector2(1750, 460), algaeAngle: 90 });
  createEgg({ pos: new Vector2(1380, 80), algaeAngle: 140 });
  createEgg({ pos: new Vector2(1750, 90), algaeAngle: 30 });

  createShell({ pos: new Vector2(1470, 150) });
  createShell({ pos: new Vector2(1570, 170) });
  createShell({ pos: new Vector2(1680, 130) });
  createShell({ pos: new Vector2(1456, 250) });
  createShell({ pos: new Vector2(1575, 240) });
  createShell({ pos: new Vector2(1675, 270) });
  createShell({ pos: new Vector2(1470, 341) });
  createShell({ pos: new Vector2(1570, 362) });
  createShell({ pos: new Vector2(1687, 371) });

  return state;
};

export const createRocks: Flow.PhaserNode = Flow.lazy((scene) => {
  const rockState = initializeState(scene);

  const flowState = Flow.makeSceneStates();

  const resetScale = (obj: Phaser.GameObjects.GameObject) =>
    Flow.tween({
      targets: obj,
      props: { scale: 1 },
      duration: 400,
    });

  const moveAlgae = Flow.sequence(
    Flow.waitTimer(4000),
    Flow.call(() =>
      rockState.eggs.forEach((egg) =>
        Def.sceneClass.events.elemReadyToPick.emit({
          key: egg.algae!.instance.key,
          bodyPart: "algae",
        })(scene),
      ),
    ),
  );

  const prepareEggRiddle = (egg: EggRockState): Flow.PhaserNode => {
    const order = _.take(_.shuffle(rockState.shells), 2);
    // 0 = no click yet, n = n items already validated
    let playerStep = 0;

    const shellOpenDuration = 670;
    const openShell = (shell: ShellRockState): Flow.PhaserNode =>
      Flow.tween({
        targets: shell.aboveObj,
        props: {
          angle: -130,
        },
        duration: shellOpenDuration,
      });

    const closeShell = (shell: ShellRockState): Flow.PhaserNode =>
      Flow.tween({
        targets: shell.aboveObj,
        props: {
          angle: 0,
        },
        duration: shellOpenDuration,
      });

    const resetShell: Flow.PhaserNode = Flow.parallel(
      ...rockState.shells.map((shell) => closeShell(shell)),
      resetScale(egg.obj),
    );

    const failEggRiddle: Flow.PhaserNode = Flow.sequence(
      resetShell,
      flowState.nextFlow(chooseEgg),
    );

    const showOrder = Flow.sequence(
      ...order.map((shell) =>
        Flow.sequence(
          Flow.waitTimer(700),
          openShell(shell),
          Flow.waitTimer(300),
          closeShell(shell),
        ),
      ),
    );

    const bloomAlgae = () => {
      egg.algae = createAlgae({
        pos: getObjectPosition(egg.obj),
        angle: egg.algaeAngle,
      });
      egg.bloomFlow.next(egg.algae.flow);
    };
    const allShellClicked = Flow.sequence(
      resetShell,
      Flow.call(bloomAlgae),
      Flow.lazy(() =>
        flowState.nextFlow(
          rockState.eggs.every((egg) => egg.algae) ? moveAlgae : chooseEgg,
        ),
      ),
    );

    const validateInput = (shell: ShellRockState): Flow.PhaserNode =>
      Flow.sequence(
        openShell(shell),
        Flow.call(() => {
          ++playerStep;
        }),
        Flow.lazy(() =>
          playerStep === order.length
            ? flowState.nextFlow(allShellClicked)
            : enterShellInput,
        ),
      );

    const enterShellInput: Flow.PhaserNode = Flow.lazy(() => {
      const targetShell = order[playerStep];
      return Flow.waitOnOfPointerdown({
        items: rockState.shells,
        getObj: getProp("aboveObj"),
        nextFlow: (shell) =>
          shell === targetShell
            ? validateInput(shell)
            : flowState.nextFlow(failEggRiddle),
      });
    });

    const shellFlows = Flow.sequence(showOrder, enterShellInput);

    return Flow.parallel(
      Flow.tween({
        targets: egg.obj,
        props: { scale: 1.5 },
        duration: 500,
        yoyo: true,
        repeat: -1,
      }),
      shellFlows,
    );
  };

  const chooseEgg: Flow.PhaserNode = Flow.lazy(() =>
    Flow.waitOnOfPointerdown({
      items: rockState.eggs.filter((egg) => !egg.algae),
      getObj: getProp("obj"),
      nextFlow: (egg) => flowState.nextFlow(prepareEggRiddle(egg)),
    }),
  );

  return Flow.parallel(
    ...rockState.eggs.map((egg) => egg.bloomFlow.start()),
    flowState.start(chooseEgg),
  );
});
