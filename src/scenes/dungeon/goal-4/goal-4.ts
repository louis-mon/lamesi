import * as Phaser from "phaser";
import { Maybe } from "purify-ts";
import { playerCannotActSubject } from "../definitions";
import * as Wp from "../wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as Geom from "/src/helpers/math/geom";
import * as Npc from "../npc";
import * as Def from "../definitions";
import { iceArmorAltar } from "../ice-armor";
import { events } from "../../global-events";
import { amuletSkillAltar } from "../skills";
import { createSpriteAt } from "/src/helpers/phaser";
import { createFlameAnim, showGreenFlame } from "./goal-4-defs";
import { puzzleRoom2Config } from "./goal-4-puzzle-room-2";
import { goal4PuzzleRoom5Config } from "./goal-4-puzzle-room-5";
import { goal4Puzzle0 } from "./goal-4-puzzle-room-0";

const allFlames = [puzzleRoom2Config, goal4PuzzleRoom5Config, goal4Puzzle0];

const greenFlames: Flow.PhaserNode = Flow.lazy((scene) => {
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
              action: Flow.sequence(
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
          ),
        ),
      ),
    ),
  );
});

const enableGoal4 = Flow.whenTrueDo({
  condition: events.dungeonPhase3.dataSubject,
  action: Flow.parallel(
    Npc.openDoor("door3To0"),
    amuletSkillAltar({ wp: { room: 4, x: 4, y: 4 } }),
    greenFlames,
  ),
});

export const dungeonGoal4: Flow.PhaserNode = Flow.parallel(
  enableGoal4,
  iceArmorAltar,
);
