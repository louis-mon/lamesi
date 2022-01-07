import { Scene } from "phaser";
import Dialog from "phaser3-rex-plugins/templates/ui/dialog/Dialog";

export const uiBuilder = (scene: Scene) => {
  return {
    title: ({ text }: { text: string }) =>
      scene.rexUI.add.label({
        text: scene.add.text(0, 0, text, { fontSize: "35px" }),
      }),
    content: ({ text }: { text: string }) =>
      scene.rexUI.add.label({
        text: scene.add.text(0, 0, text, { fontSize: "28px" }),
      }),
    button: ({ text }: { text: string }) =>
      scene.rexUI.add.label({
        background: scene.rexUI.add.roundRectangleCanvas(
          0,
          0,
          0,
          0,
          10,
          0x4abe44,
        ),
        text: scene.add.text(0, 0, text, { fontSize: "24px" }),
        space: {
          top: 10,
          left: 10,
          right: 10,
          bottom: 10,
        },
      }),
    dialog: (props: () => Dialog.IConfig) =>
      scene.rexUI.add.dialog({
        background: scene.rexUI.add.roundRectangleCanvas(
          0,
          0,
          0,
          0,
          20,
          0x2e762a,
        ),
        space: {
          top: 20,
          left: 20,
          right: 20,
          bottom: 20,
          title: 100,
          content: 100,
          action: 80,
        },
        anchor: { centerX: "center", centerY: "center" },
        ...props(),
      }),
  };
};
