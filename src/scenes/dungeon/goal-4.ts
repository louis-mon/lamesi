import * as Phaser from "phaser";
import { Maybe } from "purify-ts";
import { playerCannotActSubject } from "./definitions";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import * as Geom from "/src/helpers/math/geom";
import * as Npc from "./npc";
import * as Def from "./definitions";
import { iceArmorAltar } from "./ice-armor";

export const dungeonGoal4: Flow.PhaserNode = iceArmorAltar;
