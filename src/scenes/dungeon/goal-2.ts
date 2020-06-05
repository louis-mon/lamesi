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
} from "/src/helpers/component";
import { combineContext, getProp } from "/src/helpers/functional";
import { combineLatest } from "rxjs";
import { map } from "rxjs/operators";
import { initSkills, skillsFlow } from "./skills";

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

export const puzzleForBellAltar: Flow.PhaserNode = Flow.lazy((scene) => {
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
                duration: Math.abs(y - target.y) / (150 / 1000),
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
      ...bellAlignSwitches.map((def) => def.data.state.dataSubject(scene)),
    ).pipe(map((states) => states.every(_.identity))),
    action: Flow.call(() => console.log("bla")),
  });

  return Flow.parallel(
    Npc.openDoor("door4To3"),
    ...controlledFlow,
    ...moveControl,
    solved,
  );
});
