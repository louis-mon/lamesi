import { Scene } from "phaser";
import Dialog from "phaser3-rex-plugins/templates/ui/dialog/Dialog";

export const uiBuilder = (scene: Scene) => {
  const colors = {
    primary: 0x2e762a,
    buttonPrimary: 0x4abe44,
  };
  const containerBack = () =>
    scene.rexUI.add.roundRectangleCanvas(0, 0, 0, 0, 20, colors.primary);
  const spaceBase = 4;
  const borderSpacing = (n: number) => ({
    top: n * spaceBase,
    left: n * spaceBase,
    right: n * spaceBase,
    bottom: n * spaceBase,
  });
  const bodyText = (text: string) =>
    scene.add.text(0, 0, text, { fontSize: "28px" });
  return {
    containerBack,
    bodyText,
    borderSpacing,
    title: ({ text }: { text: string }) =>
      scene.rexUI.add.label({
        text: scene.add.text(0, 0, text, { fontSize: "35px" }),
      }),
    content: ({ text }: { text: string }) =>
      scene.rexUI.add.label({
        text: bodyText(text),
      }),
    button: ({ text }: { text: string }) =>
      scene.rexUI.add.label({
        background: scene.rexUI.add.roundRectangleCanvas(
          0,
          0,
          0,
          0,
          10,
          colors.buttonPrimary,
        ),
        text: bodyText(text),
        space: borderSpacing(3),
      }),
    dialog: (props: () => Dialog.IConfig) =>
      scene.rexUI.add.dialog({
        background: containerBack(),
        space: {
          ...borderSpacing(5),
          title: 100,
          content: 100,
          action: 80,
        },
        anchor: { centerX: "center", centerY: "center" },
        ...props(),
      }),
  };
};
