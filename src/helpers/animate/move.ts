import * as Flow from "../phaser-flow";
import Phaser from "phaser";
import { getObjectPosition, vecToXY } from "/src/helpers/phaser";
import { FuncOrConst, funcOrConstValue } from "/src/helpers/functional";

export const moveTo = (
  getProps: FuncOrConst<
    Flow.Context,
    {
      target: Phaser.GameObjects.Components.Transform;
      speed: number;
      dest: Phaser.Math.Vector2;
    } & Phaser.Types.Tweens.TweenPropConfig
  >,
) =>
  Flow.tween((c) => {
    const { target, dest, speed, ...rest } = funcOrConstValue(c, getProps);
    const from = getObjectPosition(target);
    const duration = from.distance(dest) / (speed / 1000);
    return {
      targets: target,
      props: vecToXY(dest),
      duration,
      ...rest,
    };
  });
