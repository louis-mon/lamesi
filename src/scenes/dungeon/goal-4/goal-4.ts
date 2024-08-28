import * as Phaser from "phaser";
import * as Flow from "/src/helpers/phaser-flow";
import * as Npc from "../npc";
import * as Def from "../definitions";
import { globalData } from "../../common/global-data";
import { amuletSkillAltar } from "../skills";
import { createFlameAnim, showGreenFlame } from "./goal-4-defs";
import { puzzleRoom2Config } from "./goal-4-puzzle-room-2";
import { goal4PuzzleRoom5Config } from "./goal-4-puzzle-room-5";
import { goal4Puzzle0 } from "./goal-4-puzzle-room-0";
import { combineLatest, fromEvent } from "rxjs";
import { map } from "rxjs/operators";
import {
  altarAppearCutscene,
  dungeonCutscene,
} from "/src/scenes/dungeon/dungeon-cutscene";
import { isEventSolved } from "/src/scenes/common/events-def";

const allFlames = [puzzleRoom2Config, goal4PuzzleRoom5Config, goal4Puzzle0];

const greenFlames: Flow.PhaserNode = Flow.lazy((scene) => {
  if (isEventSolved("dungeonPhase4")(scene)) {
    return Flow.noop;
  }
  createFlameAnim(scene);
  const particles = scene.add.particles("npc").setDepth(Def.depths.npc);
  return Flow.parallel(
    ...allFlames.map(({ instance, flow }) =>
      Flow.sequence(
        showGreenFlame(instance),
        Flow.lazy((scene) =>
          Flow.parallel(
            flow,
            Flow.whenTrueDo({
              condition: instance.instance.data.solved.dataSubject,
              action: dungeonCutscene({
                targetWp: instance.config.pos,
                inCutscene: Flow.sequence(
                  Flow.tween({
                    targets: instance.hintInstance.getObj(scene),
                    props: { alpha: 0.6 },
                    duration: 1000,
                  }),
                  Flow.call(() => {
                    const hintObj = instance.hintInstance.getObj(scene);
                    particles.createEmitter({
                      follow: hintObj,
                      scale: hintObj.scale,
                      frame: instance.config.hintFrame,
                      x: 0,
                      y: 0,
                      speedY: -80,
                      frequency: 350,
                      quantity: 1,
                      alpha: { start: hintObj.alpha, end: 0 },
                      lifespan: 750,
                    });
                  }),
                ),
              }),
            }),
          ),
        ),
      ),
    ),
    Flow.lazy(() =>
      Flow.whenTrueDo({
        condition: combineLatest(
          allFlames.map((flameDef) =>
            flameDef.instance.instance.data.solved.dataSubject(scene),
          ),
        ).pipe(map((values) => values.every((x) => x))),
        action: Flow.sequence(
          Flow.waitTimer(1000),
          altarAppearCutscene({
            wp: { room: 4, x: 1, y: 4 },
            altarAppear: (params) =>
              Npc.endGoalAltarPlaceholder({
                eventToSolve: "dungeonPhase4",
                ...params,
              }),
          }),
        ),
      }),
    ),
  );
});

const cheatCode: Flow.PhaserNode = Flow.lazy((scene) => {
  const keyToEvent: Array<{ key: number; def: typeof goal4Puzzle0 }> = [
    { key: Phaser.Input.Keyboard.KeyCodes.ONE, def: goal4Puzzle0 },
    { key: Phaser.Input.Keyboard.KeyCodes.TWO, def: puzzleRoom2Config },
    { key: Phaser.Input.Keyboard.KeyCodes.THREE, def: goal4PuzzleRoom5Config },
  ];
  return Flow.parallel(
    ...keyToEvent.map(({ key, def }) =>
      Flow.observe(fromEvent(scene.input.keyboard.addKey(key), `down`), () =>
        Flow.call(def.instance.instance.data.solved.setValue(true)),
      ),
    ),
  );
});

const enableGoal4 = Flow.whenTrueDo({
  condition: globalData.dungeonPhase4.dataSubject,
  action: Flow.parallel(
    Npc.openDoor("door3To0"),
    amuletSkillAltar({ wp: { room: 4, x: 4, y: 4 } }),
    greenFlames,
  ),
});

export const dungeonGoal4: Flow.PhaserNode = Flow.parallel(enableGoal4);
