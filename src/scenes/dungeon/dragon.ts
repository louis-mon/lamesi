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

export const dragon: Flow.PhaserNode = Flow.lazy((scene) => {
  const basePos = new Vector2(0, -9.0).add(Wp.wpPos({ room: 1, x: 2, y: 2 }));
  const bodyObj = createSpriteAt(scene, basePos, "dragon", "body").setDepth(
    Def.depths.npc,
  );
  const headObj = createSpriteAt(
    scene,
    new Vector2(0, -60).add(basePos),
    "dragon",
    "head",
  ).setDepth(Def.depths.floating);
  const wingObjs = [1, -1].map((flip) =>
    createSpriteAt(
      scene,
      new Vector2(flip * 50, 0).add(basePos),
      "dragon",
      "wing",
    ).setFlipX(flip === 1).setDepth(
        Def.depths.npc,
      ),
  );
  const footObjs = [1, -1].map((flip) =>
    createSpriteAt(
      scene,
      new Vector2(flip * 50, 50).add(basePos),
      "dragon",
      "foot",
    ).setFlipX(flip === 1).setDepth(
        Def.depths.npc,
      ),
  );
  return Flow.parallel();
});
