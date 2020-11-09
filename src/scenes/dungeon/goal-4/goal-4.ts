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
import {
  createFlameAnim,
  hintFlameRoom0,
  hintFlameRoom2,
  hintFlameRoom3,
  hintFlameRoom5,
  showGreenFlame,
} from "./goal-4-defs";
import { puzzleRoom2Config } from "./goal-4-puzzle-room-2";

const allFlames = [puzzleRoom2Config];

const greenFlames: Flow.PhaserNode = Flow.lazy((scene) => {
  createFlameAnim(scene);
  return Flow.parallel(
    ...allFlames.map(({ instance, flow }) =>
      Flow.sequence(
        showGreenFlame(instance),
        Flow.lazy((scene) =>
          Flow.parallel(
            flow,
            Flow.whenTrueDo({
              condition: instance.instance.data.solved.dataSubject,
              action: Flow.tween({
                targets: instance.hintInstance.getObj(scene),
                props: { scale: 0.25 },
                repeat: -1,
                duration: 600,
                yoyo: true,
              }),
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
    amuletSkillAltar({ wp: { room: 4, x: 4, y: 4 } }),
    greenFlames,
  ),
});

export const dungeonGoal4: Flow.PhaserNode = Flow.parallel(
  enableGoal4,
  iceArmorAltar,
);
