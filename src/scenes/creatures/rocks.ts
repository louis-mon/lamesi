import Phaser from "phaser";

import {
  createImageAt,
  createSpriteAt,
  getObjectPosition,
  placeAt,
} from "/src/helpers/phaser";
import * as Flow from "/src/helpers/phaser-flow";
import {
  declareGoInstance,
  observeCommonGoEvent,
} from "/src/helpers/component";
import { getProp } from "/src/helpers/functional";
import * as Def from "./def";
import _ from "lodash";
import { Maybe } from "purify-ts";
import { MovedCurve } from "/src/helpers/math/curves";
import { makeControlledValue } from "/src/helpers/animate/tween";
import Vector2 = Phaser.Math.Vector2;
import {
  followObject,
  followPosition,
  followRotation,
} from "/src/helpers/animate/composite";

export const createRocks: Flow.PhaserNode = Flow.lazy((scene) => {
  const egg = scene.add.image(800, 20, "rocks", "egg");
  const shell = scene.add.image(800, 20, "rocks", "shell-1");

  return Flow.noop;
});
