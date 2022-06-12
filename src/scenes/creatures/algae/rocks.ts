import Phaser from "phaser";

import { createImageAt, getObjectPosition, vecToXY } from "/src/helpers/phaser";
import * as Flow from "/src/helpers/phaser-flow";
import { getProp } from "/src/helpers/functional";
import * as Def from "../def";
import _ from "lodash";
import Vector2 = Phaser.Math.Vector2;
import {
  AlgaeController,
  createAlgae,
} from "/src/scenes/creatures/algae/algae";
import { moveTo } from "/src/helpers/animate/move";
import { globalData } from "/src/scenes/common/global-data";
import DegToRad = Phaser.Math.DegToRad;
import { isEventReady, isEventSolved } from "/src/scenes/common/events-def";
import { globalEvents } from "/src/scenes/common/global-events";
import { manDeskPos, moveMan } from "/src/scenes/creatures/man";
import { cutscene } from "/src/scenes/common/cutscene";

type EggRockState = {
  obj: Phaser.GameObjects.Image;
  algae: AlgaeController | null;
  bloomFlow: Flow.SceneStatesFlow;
  algaeRotation: number;
};

type ShellRockState = {
  belowObj: Phaser.GameObjects.Image;
  aboveObj: Phaser.GameObjects.Image;
  ball?: Phaser.GameObjects.Image;
};

type RockState = {
  eggs: EggRockState[];
  shells: ShellRockState[];
};

const initializeState = (scene: Phaser.Scene): RockState => {
  const state: RockState = { eggs: [], shells: [] };
  const createEgg = ({
    pos,
    algaeRotation,
  }: {
    pos: Vector2;
    algaeRotation: number;
  }) => {
    const newEgg = scene.add
      .image(pos.x, pos.y, "rocks", "egg")
      .setDepth(Def.depths.rocks.rock)
      .setInteractive();
    state.eggs.push({
      obj: newEgg,
      algae: null,
      bloomFlow: Flow.makeSceneStates(),
      algaeRotation,
    });
  };
  const createShell = ({ pos }: { pos: Vector2 }) => {
    const newShell = scene.add
      .image(pos.x, pos.y, "rocks", "shell-2")
      .setDepth(Def.depths.rocks.shellBelow)
      .setOrigin(0.5, 0);
    const newShellAbove = scene.add
      .image(pos.x, pos.y, "rocks", "shell-1")
      .setDepth(Def.depths.rocks.shellAbove)
      .setOrigin(0.5, 0)
      .setInteractive();
    state.shells.push({ belowObj: newShell, aboveObj: newShellAbove });
  };

  createEgg({ pos: new Vector2(1400, 430), algaeRotation: DegToRad(-148) });
  createEgg({ pos: new Vector2(1750, 460), algaeRotation: Math.PI / 2 });
  createEgg({ pos: new Vector2(1380, 80), algaeRotation: DegToRad(140) });
  createEgg({ pos: new Vector2(1750, 90), algaeRotation: Math.PI / 6 });

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

export const rockFlow: Flow.PhaserNode = Flow.lazy((scene) => {
  const requiredEvent = Def.bodyPartsConfig.algae.requiredEvent;
  if (!isEventReady(requiredEvent)(scene)) {
    return Flow.noop;
  }
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
    const shellsNotInOrder = _.difference(rockState.shells, order);
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
      ...rockState.shells.map((shell) =>
        Flow.sequence(
          closeShell(shell),
          Flow.call(() => shell.ball?.destroy()),
        ),
      ),
      resetScale(egg.obj),
    );

    const failEggRiddle: Flow.PhaserNode = Flow.sequence(
      Flow.parallel(...rockState.shells.map(openShell)),
      Flow.parallel(
        ...order.map((shell) =>
          Flow.lazy(() =>
            Flow.tween({
              targets: shell.ball,
              props: {
                scale: 3,
                alpha: 0,
              },
              duration: 1200,
            }),
          ),
        ),
      ),
      resetShell,
      flowState.nextFlow(chooseEgg),
    );

    const ballSpeed = 300 / 1000;
    const sendBallToShell = (shell: ShellRockState): Flow.PhaserNode =>
      Flow.lazy(() => {
        const startPos = getObjectPosition(egg.obj);
        shell.ball = createImageAt(scene, startPos, "rocks", "ball")
          .setScale(0)
          .setDepth(Def.depths.rocks.ball);
        scene.tweens.add({
          targets: shell.ball,
          props: {
            angle: 360,
          },
          duration: 470,
          repeat: -1,
        });
        return Flow.sequence(
          Flow.waitTimer(700),
          Flow.tween({
            targets: shell.ball,
            props: { scale: 0.7 },
            duration: 250,
          }),
          Flow.tween({
            targets: shell.ball,
            props: vecToXY(startPos.clone().add(new Vector2(0, -54))),
            duration: 400,
          }),
          Flow.waitTimer(800),
          moveTo({
            target: shell.ball,
            dest: getObjectPosition(shell.aboveObj)
              .clone()
              .add(new Vector2(0, 17)),
            speed: ballSpeed,
          }),
          Flow.call(() => shell.ball?.setDepth(shell.belowObj.depth)),
          Flow.waitTimer(300),
          closeShell(shell),
        );
      });

    const showOrder = Flow.sequence(
      Flow.parallel(...rockState.shells.map(openShell)),
      ...order.map(sendBallToShell),
      Flow.parallel(...shellsNotInOrder.map(closeShell)),
    );

    const bloomAlgae = () => {
      egg.algae = createAlgae({
        pos: () => getObjectPosition(egg.obj),
        rotation: () => egg.algaeRotation,
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
        moveTo({
          target: shell.ball!,
          speed: ballSpeed,
          dest: getObjectPosition(egg.obj),
        }),
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

  const openingAnimation: Flow.PhaserNode = Flow.lazy(() => {
    const itinerary: Vector2[] = [
      new Vector2(1320, 800),
      new Vector2(1320, 550),
      new Vector2(1575, 500),
    ];
    rockState.eggs.forEach((egg) => egg.obj.setScale(0));
    return Flow.sequence(
      Flow.wait(globalEvents.subSceneEntered.subject),
      Flow.waitTrue(globalData.creatures4Done.dataSubject),
      cutscene(
        Flow.sequence(
          ...itinerary.map((dest) => moveMan({ dest })),
          Flow.parallel(
            ...rockState.eggs.map((egg) =>
              Flow.tween({
                targets: egg.obj,
                props: { scale: 1 },
                duration: 2000,
              }),
            ),
          ),
          ...itinerary
            .slice()
            .reverse()
            .concat(manDeskPos)
            .map((dest) => moveMan({ dest })),
          flowState.nextFlow(chooseEgg),
        ),
      ),
    );
  });

  const startingPoint: Flow.PhaserNode = Flow.lazy(() => {
    if (isEventSolved(requiredEvent)(scene)) return chooseEgg;
    return openingAnimation;
  });

  return Flow.parallel(
    ...rockState.eggs.map((egg) => egg.bloomFlow.start()),
    flowState.start(startingPoint),
  );
});
