import { ManipulableObject } from "/src/helpers/phaser";
import _ from "lodash";
import Phaser from "phaser";
import Vector2Like = Phaser.Types.Math.Vector2Like;

import * as Flow from "/src/helpers/phaser-flow";
import Vector2 = Phaser.Math.Vector2;

export const memoryCyclicTween = ({
  getObj,
  attr1,
  attr2,
  speed,
}: {
  getObj: () => ManipulableObject;
  speed: number;
  attr1: Vector2Like;
  attr2: Vector2Like;
}): Flow.PhaserNode => {
  let dir = 1;
  return Flow.repeat(
    Flow.sequence(
      Flow.tween(() => {
        const attr = dir === 1 ? attr2 : attr1;
        const obj = getObj();
        return {
          targets: obj,
          props: attr as {},
          duration:
            Phaser.Math.Distance.BetweenPoints(
              new Vector2(attr),
              new Vector2(_.pick(obj, Object.keys(attr))),
            ) / speed,
        };
      }),
      Flow.call(() => {
        dir = dir * -1;
      }),
    ),
  );
};
