import Vector2 = Phaser.Math.Vector2;
import {
  createSpriteAt,
  vecToXY,
  createImageAt,
  placeAt,
  addPhysicsFromSprite,
} from "/src/helpers/phaser";
import { subWordGameBeginEvent, gameWidth, gameHeight } from "../common";
import * as Flow from "/src/helpers/phaser-flow";
import { annotate } from "/src/helpers/typing";
import {
  defineGoClass,
  declareGoInstance,
  customEvent,
} from "/src/helpers/component";
import { combineContext } from "/src/helpers/functional";
import { combineLatest, fromEvent } from "rxjs";
import { map } from "rxjs/operators";
import { createTree } from "./tree";
import { createCentralCreature } from "./central";

export class CreaturesScene extends Phaser.Scene {
  constructor() {
    super({
      key: "creatures",
      loader: {
        path: "assets/creatures",
      },
    });
  }

  preload() {
    this.load.atlas("tree");
    this.load.atlas("central");
  }

  create() {
    Flow.run(this, Flow.parallel(createTree, createCentralCreature));
  }
}
