import { Scene } from "phaser";
import Dialog from "phaser3-rex-plugins/templates/ui/dialog/Dialog";
import TextStyle = Phaser.Types.GameObjects.Text.TextStyle;

export const uiBuilder = (scene: Scene) => {
  const colors = {
    primary: 0x2e762a,
    primaryDark: 0x194c28,
  };
  const containerBack = () =>
    scene.rexUI.add.roundRectangleCanvas(
      0,
      0,
      0,
      0,
      20,
      colors.primary,
      colors.primaryDark,
      3,
    );
  const spaceBase = 4;
  const borderSpacing = (n: number) => ({
    top: n * spaceBase,
    left: n * spaceBase,
    right: n * spaceBase,
    bottom: n * spaceBase,
  });
  const bodyText = (text: string, style: TextStyle = {}) =>
    scene.add.text(0, 0, text, { fontSize: "28px", ...style });
  return {
    containerBack,
    bodyText,
    borderSpacing,
    title: ({ text }: { text: string }) =>
      scene.rexUI.add.label({
        text: scene.add.text(0, 0, text, { fontSize: "35px" }),
        align: "center",
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
          colors.primaryDark,
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
