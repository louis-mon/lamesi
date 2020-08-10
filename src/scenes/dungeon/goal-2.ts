import * as Phaser from "phaser";
import _ from "lodash";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as Def from "./definitions";

import Vector2 = Phaser.Math.Vector2;
import { createSpriteAt, vecToXY, createImageAt } from "/src/helpers/phaser";
import * as Npc from "./npc";
import { makeMenu } from "./menu";
import { subWordGameBeginEvent, gameWidth, gameHeight } from "../common";
import { annotate } from "/src/helpers/typing";
import {
  defineGoClass,
  declareGoInstance,
  customEvent,
  defineData,
  makeSceneDataHelper,
  defineGoClassKind,
} from "/src/helpers/component";
import { combineContext, getProp } from "/src/helpers/functional";
import { combineLatest } from "rxjs";
import { map, pairwise, auditTime, first } from "rxjs/operators";
import {
  initSkills,
  skillsFlow,
  bellSkillAltar,
  bellHiddenAction,
} from "./skills";

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
    let dir = 1;
    return Flow.parallel(
      Flow.taskWithSentinel({
        condition: controlSwitchDef.switchDef.data.state.dataSubject,
        task: Flow.repeat(
          Flow.sequence(
            Flow.tween(() => {
              const y =
                dir === 1
                  ? Wp.wpPos({ room: 3, x: 0, y: 4 }).y
                  : Wp.wpPos({ room: 3, x: 0, y: 2 }).y;
              const target = controlledDef.getObj(scene);
              return {
                targets: target,
                props: {
                  y,
                },
                duration: Math.abs(y - target.y) / (75 / 1000),
              };
            }),
            Flow.call(() => {
              dir = dir * -1;
            }),
          ),
        ),
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

  const solved = Flow.when({
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
const room2floorState = makeSceneDataHelper<Room2FloorState>(
  "room2-floor-state",
);

export const room2GoalPuzzle: Flow.PhaserNode = Flow.lazy((scene) => {
  room2floorState.setValue({})(scene);
  const nbTilesX = 3;
  const nbTilesY = 4;
  const tilesWps: Wp.WpDef[] = _.range(nbTilesX * nbTilesY).map((i) => {
    const { x, y } = Phaser.Math.ToXY(i, nbTilesX, nbTilesY).add(
      new Vector2(2, 1),
    );
    return { room: 2, x, y };
  });
  const tileDef = defineGoClassKind<Phaser.GameObjects.Sprite>();
  const tileName = (wp: Def.WpDef) => `room2-floor-tile-${Wp.getWpId(wp)}`;
  tilesWps.forEach((wp) => {
    createSpriteAt(scene, Wp.wpPos(wp), "npc", "room-2-floor")
      .setDepth(Def.depths.carpet)
      .setName(tileName(wp))
      .setAlpha(0);
  });
  const bellEvents = Flow.parallel(
    ...tilesWps.map((wp) =>
      Flow.repeat(
        bellHiddenAction({
          action: () => {
            const wpId = Wp.getWpId(wp);
            const floorActive = room2floorState.value(scene)[wpId];
            return Flow.sequence(
              Flow.tween({
                targets: tileDef.getObj(tileName(wp))(scene),
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
  );
  const checkSolve = Flow.observe(
    room2floorState.dataSubject(scene).pipe(
      auditTime(1000),
      first((state) => {
        const solution = [0, 1, 2, 4, 6, 7, 8, 10].map((i) =>
          Wp.getWpId(tilesWps[i]),
        );
        return tilesWps.every(
          (wp) => solution.includes(Wp.getWpId(wp)) === !!state[Wp.getWpId(wp)],
        );
      }),
      map(() =>
        Npc.endGoalAltarPlaceholder({ wp: { room: 2, x: 3, y: 0 }, n: 2 }),
      ),
    ),
  );
  return Flow.parallel(bellEvents, checkSolve);
});

export const dungeonGoal2 = Flow.parallel(
  puzzleForBellAltar,
  hintSymbol,
  room2GoalPuzzle,
);
