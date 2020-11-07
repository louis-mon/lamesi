import * as Phaser from "phaser";
import { Maybe } from "purify-ts";
import { playerCannotActSubject } from "./definitions";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as Geom from "/src/helpers/math/geom";
import * as Npc from "./npc";
import * as Def from "./definitions";
import { iceArmorAltar } from "./ice-armor";
import { events } from "../global-events";
import { amuletSkillAltar } from "./skills";

const enableGoal4 = Flow.whenTrueDo({
  condition: events.dungeonPhase3.dataSubject,
  action: amuletSkillAltar({ wp: { room: 4, x: 4, y: 4 } }),
});

export const dungeonGoal4: Flow.PhaserNode = Flow.parallel(
  enableGoal4,
  iceArmorAltar,
);
