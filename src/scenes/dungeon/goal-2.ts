import { memoryCyclicTween } from "/src/helpers/animate/tween";
import {
  declareGoInstance,
  makeSceneDataHelper,
  spriteClassKind,
} from "/src/helpers/component";
import { getProp } from "/src/helpers/functional";
import { createSpriteAt, SceneContext } from "/src/helpers/phaser";
import * as Flow from "/src/helpers/phaser-flow";
import _ from "lodash";
import * as Phaser from "phaser";
import { combineLatest, Observable } from "rxjs";
import { auditTime, first, map } from "rxjs/operators";
import * as Def from "./definitions";
import * as Npc from "./npc";
import { arrowSkillAltar, bellHiddenAction, bellSkillAltar } from "./skills";
import * as Wp from "./wp";
import Vector2 = Phaser.Math.Vector2;
import { doorCenterPos, DoorKey } from "./npc";
import {
  findPreviousEvent,
  isEventSolved,
} from "/src/scenes/common/events-def";
import { globalEvents } from "/src/scenes/common/global-events";
import { globalData } from "/src/scenes/common/global-data";
import { createKeyItem } from "/src/scenes/common/key-item";

const bellAlignSwitches = [
  declareGoInstance(Def.switchClass, "switch-align-bell-1", {
    wp: { room: 3, x: 0, y: 3 },
    offset: new Vector2(0, 0),
  }),
  declareGoInstance(Def.switchClass, "switch-align-bell-2", {
    wp: { room: 3, x: 1, y: 4 },
    offset: new Vector2(30, 0),
  }),
  declareGoInstance(Def.switchClass, "switch-align-bell-3", {
    wp: { room: 3, x: 2, y: 2 },
    offset: new Vector2(60, 0),
  }),
];

const bellAlignControlSwitches = [
  {
    switchDef: declareGoInstance(Def.switchClass, "switch-align-control-1", {
      wp: { room: 3, x: 4, y: 3 },
      offset: new Vector2(20, 0),
      deactivable: true,
    }),
    control: "switch-align-bell-1",
  },
  {
    switchDef: declareGoInstance(Def.switchClass, "switch-align-control-2", {
      wp: { room: 3, x: 4, y: 4 },
      offset: new Vector2(20, 0),
      deactivable: true,
    }),
    control: "switch-align-bell-2",
  },
];

const puzzleForBellAltar: Flow.PhaserNode = Flow.lazy((scene) => {
  const switchFactory = Npc.switchCrystalFactory(scene);
  bellAlignSwitches.forEach(switchFactory);
  bellAlignControlSwitches.map(getProp("switchDef")).forEach(switchFactory);

  Wp.setGroundObstacleLine({
    kind: "spike",
    room: 3,
    line: new Phaser.Geom.Line(0, 2, 4, 2),
  })(scene);
  Wp.setGroundObstacleLine({
    kind: "wall",
    room: 3,
    line: new Phaser.Geom.Line(4, 2, 4, 5),
  })(scene);

  const moveControl = bellAlignControlSwitches.map((controlSwitchDef) => {
    const controlledDef = bellAlignSwitches.find(
      (def) => def.key === controlSwitchDef.control,
    )!;
    const memoryTween = memoryCyclicTween({
      getObj: () => controlledDef.getObj(scene),
      attr1: { y: Wp.wpPos({ room: 3, x: 0, y: 2 }).y },
      attr2: { y: Wp.wpPos({ room: 3, x: 0, y: 4 }).y },
      speed: 75 / 1000,
    });
    return Flow.parallel(
      Flow.taskWithSentinel({
        condition: controlSwitchDef.switchDef.data.state.dataSubject,
        task: memoryTween,
      }),
    );
  });

  const controlledFlow = bellAlignSwitches.map((def) =>
    Flow.repeatWhen({
      condition: def.data.state.dataSubject,
      action: Flow.sequence(
        Flow.waitTimer(100),
        Flow.call(def.events.deactivateSwitch.emit({})),
      ),
    }),
  );

  const solved = Flow.whenTrueDo({
    condition: combineLatest(
      bellAlignSwitches.map((def) => def.data.state.dataSubject(scene)),
    ).pipe(map((states) => states.every(_.identity))),
    action: bellSkillAltar({ wp: { room: 3, x: 0, y: 0 } }),
  });

  return Flow.parallel(...controlledFlow, ...moveControl, solved);
});

const hintSymbol = bellHiddenAction({
  wp: { room: 3, x: 4, y: 0 },
  action: ({ wp }) =>
    Flow.lazy((scene) => {
      const hintObj = createSpriteAt(
        scene,
        Wp.wpPos(wp).clone().add(new Vector2(0, 10)),
        "npc",
        "goal-2-hint",
      )
        .setAlpha(0)
        .setDepth(Def.depths.carpet);
      return Flow.tween({ targets: hintObj, props: { alpha: 1 } });
    }),
});

type Room2FloorState = { [key: string]: boolean };
const room2floorState =
  makeSceneDataHelper<Room2FloorState>("room2-floor-state");

export const swappingTileBellActions = (tileWps: Wp.WpDef[]): Flow.PhaserNode =>
  Flow.lazy((scene) =>
    Flow.parallel(
      ...tileWps.map((wp) =>
        Flow.repeat(
          bellHiddenAction({
            action: () => {
              const wpId = Wp.getWpId(wp);
              const floorActive = room2floorState.value(scene)[wpId];
              return Flow.sequence(
                Flow.tween({
                  targets: spriteClassKind.getObj(tileName(wp))(scene),
                  props: { alpha: floorActive ? 0 : 0.7 },
                  duration: 500,
                }),
                Flow.call(
                  room2floorState.updateValue((state) => ({
                    ...state,
                    [wpId]: !state[wpId],
                  })),
                ),
              );
            },
            wp,
          }),
        ),
      ),
    ),
  );

const nbTilesX = 3;
const nbTilesY = 5;
const allTileWps: Wp.WpDef[] = _.range(nbTilesX * nbTilesY).map((i) => {
  const { x, y } = Phaser.Math.ToXY(i, nbTilesX, nbTilesY).add(
    new Vector2(2, 0),
  );
  return { room: 2, x, y };
});

export const [secondSwappingTiles, firstSwappingTiles] = _.partition(
  allTileWps,
  (wp) => wp.y === 0,
);

const createTiles = (scene: Phaser.Scene) => {
  allTileWps.forEach((wp) => {
    createSpriteAt(scene, Wp.wpPos(wp), "npc", "room-2-floor")
      .setDepth(Def.depths.carpet)
      .setName(tileName(wp))
      .setAlpha(0);
  });
};

export const checkSolveSwappingTiles =
  (solutionIds: number[]): SceneContext<Observable<unknown>> =>
  (scene) =>
    room2floorState.dataSubject(scene).pipe(
      auditTime(1000),
      first((state) => {
        const solution = solutionIds.map((i) => Wp.getWpId(allTileWps[i]));
        return allTileWps.every(
          (wp) => solution.includes(Wp.getWpId(wp)) === !!state[Wp.getWpId(wp)],
        );
      }),
    );

const tileName = (wp: Def.WpDef) => `room2-floor-tile-${Wp.getWpId(wp)}`;
export const room2GoalPuzzle: Flow.PhaserNode = Flow.lazy((scene) => {
  room2floorState.setValue({})(scene);
  createTiles(scene);
  const checkSolve = Flow.observe(
    checkSolveSwappingTiles([0, 1, 2, 4, 6, 7, 8, 10].map((i) => i + 3)),
    () =>
      Npc.endGoalAltarPlaceholder({
        wp: { room: 2, x: 3, y: 0 },
        eventToSolve: "dungeonPhase2",
      }),
  );
  return Flow.parallel(swappingTileBellActions(firstSwappingTiles), checkSolve);
});

const newDoorsToOpen: DoorKey[] = ["door5To2", "door4To3"];

const openNewDoorsAnim = Flow.whenTrueDo({
  condition: globalEvents.subSceneEntered.subject,
  action: Flow.parallel(
    ...newDoorsToOpen.map(
      (doorKey): Flow.PhaserNode =>
        Flow.lazy((scene) => {
          const keyItem = createKeyItem(
            findPreviousEvent("dungeonPhase2"),
            scene,
          );
          keyItem.obj.setDepth(Def.depths.keyItems);
          return Flow.sequence(
            keyItem.downAnim(doorCenterPos(doorKey)),
            keyItem.disappearAnim(),
            Npc.openDoor(doorKey),
          );
        }),
    ),
  ),
});

const enableGoal2 = Flow.whenTrueDo({
  condition: globalData.dungeonPhase2.dataSubject,
  action: Flow.lazy((scene) => {
    const isSolved = isEventSolved("dungeonPhase2")(scene);
    return Flow.parallel(
      Flow.sequence(
        Npc.openDoor("door4To5"),
        isSolved ? Flow.noop : openNewDoorsAnim,
      ),
      ...(isSolved ? newDoorsToOpen.map(Npc.openDoor) : []),
      arrowSkillAltar({ wp: { room: 4, x: 0, y: 4 } }),
    );
  }),
});

export const dungeonGoal2 = Flow.parallel(
  enableGoal2,
  puzzleForBellAltar,
  hintSymbol,
  room2GoalPuzzle,
);
