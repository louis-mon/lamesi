import Phaser from "phaser";
import Color = Phaser.Display.Color;
import { omit } from "lodash";

export const colorTweenParams = <T extends object, Props extends keyof T>({
  targets,
  propName,
  value,
}: {
  targets: T;
  propName: Props;
  value: number;
}): Pick<Phaser.Types.Tweens.TweenBuilderConfig, "targets" | "props"> => {
  const getObjectValue = () =>
    propName === "tint" ? (targets as any)["tintTopLeft"] : targets[propName];
  const proxy = new Proxy(targets, {
    get(target, prop) {
      return (Phaser.Display.Color.ColorToRGBA(getObjectValue()) as any)[
        prop.toString()
      ];
    },
    set(target, prop, value) {
      const oldColor = Phaser.Display.Color.ColorToRGBA(getObjectValue());
      target[propName] = Phaser.Display.Color.GetColor(
        prop === "r" ? value : oldColor.r,
        prop === "g" ? value : oldColor.g,
        prop === "b" ? value : oldColor.b,
      ) as any;
      return true;
    },
  });
  return {
    targets: proxy,
    props: omit(Color.IntegerToRGB(value), "a"),
  };
};
