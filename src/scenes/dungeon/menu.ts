import * as Phaser from "phaser";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import { menuHelpers } from "../menu";

const actionEmptyFrame = "action-empty";
const skillButtonName = "skill-button";
const actionButtonName = "action-button";

export const makeMenu = (scene: Phaser.Scene) => {
  const menuScene = menuHelpers.getMenuScene(scene);
  const skillButton = menuScene
    .addRightButton(({ x, y }) =>
      scene.add.sprite(x, y, "menu", actionEmptyFrame),
    )
    .setName(skillButtonName);
  const actionButton = menuScene
    .addRightButton(({ x, y }) =>
      scene.add.sprite(x, y, "menu", actionEmptyFrame),
    )
    .setName(actionButtonName);
};

const getActionButton = (scene: Phaser.Scene) =>
  scene.children.getByName(actionButtonName)! as Phaser.GameObjects.Sprite;

export const bindActionButton = (p: {
  frameKey: string;
  action: Flow.PhaserNode;
}): Flow.PhaserNode => {
  return Flow.withCleanup({
    action: Flow.sequence(
      Flow.call((scene) => getActionButton(scene).setFrame(p.frameKey)),
      Flow.loop(
        Flow.sequence(
          Flow.lazy((scene) =>
            Flow.waitForEvent({
              emitter: getActionButton(scene),
              event: "pointerdown",
            }),
          ),
          p.action,
        ),
      ),
    ),
    cleanup: (scene) => getActionButton(scene).setFrame(actionEmptyFrame),
  });
};
