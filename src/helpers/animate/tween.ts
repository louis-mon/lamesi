import { ManipulableObject } from "/src/helpers/phaser";
import _ from "lodash";
import Phaser from "phaser";

import * as Flow from "/src/helpers/phaser-flow";
import Vector2Like = Phaser.Types.Math.Vector2Like;
import Vector2 = Phaser.Math.Vector2;

export const tintProxy = (source: Phaser.GameObjects.Components.Tint) =>
  new Proxy(source, {
    get(target, prop) {
      if (prop.toString().match(/^r|g|b$/)) {
        return (Phaser.Display.Color.ColorToRGBA(target.tintBottomLeft) as any)[
          prop.toString()
        ];
      }
      return (target as any)[prop];
    },
    set(target, prop, value) {
      if (prop.toString().match(/^r|g|b$/)) {
        const oldColor = Phaser.Display.Color.ColorToRGBA(
          target.tintBottomLeft,
        );
        target.tint = Phaser.Display.Color.GetColor(
          prop === "r" ? value : oldColor.r,
          prop === "g" ? value : oldColor.g,
          prop === "b" ? value : oldColor.b,
        );
      } else {
        (target as any)[prop.toString()] = value;
      }
      return true;
    },
  });

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

/*
For usage in a phaser tween
 */
export const makeControlledValue = <T>({
  startValue,
  setter,
}: {
  startValue: T;
  setter: (t: T) => void;
}) => {
  let currentValue = startValue;
  return {
    get value() {
      return currentValue;
    },
    set value(newValue: T) {
      currentValue = newValue;
      setter(newValue);
    },
  };
};
