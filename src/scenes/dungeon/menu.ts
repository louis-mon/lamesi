import * as Phaser from "phaser";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import { menuHelpers } from "../menu";
import {
  defineGoClass,
  customEvent,
  declareGoInstances,
  commonGoEvents,
  SceneContext,
} from "/src/helpers/component";
import { annotate } from "/src/helpers/typing";
import { combineContext, FuncOrConst } from "/src/helpers/functional";
import { Observable } from "rxjs";
import { startWith, pairwise } from "rxjs/operators";

const actionEmptyFrame = "action-empty";

type BindActionParams = { action: Flow.PhaserNode; frameKey: string };
export const menuButtonClass = defineGoClass({
  events: {
    bindAction: customEvent<BindActionParams>(),
    unbindAction: customEvent(),
  },
  data: { action: annotate<Flow.PhaserNode>() },
  kind: annotate<Phaser.GameObjects.Sprite>(),
});

export const buttons = declareGoInstances(menuButtonClass, "buttons", {
  skill: {},
  action: {},
});

export const makeMenu = (scene: Phaser.Scene) => {
  const menuScene = menuHelpers.getMenuScene(scene);
  buttons.skill.create(
    menuScene.addRightButton(({ x, y }) =>
      scene.add.sprite(x, y, "menu", actionEmptyFrame),
    ),
  );
  buttons.action.create(
    menuScene.addRightButton(({ x, y }) =>
      scene.add.sprite(x, y, "menu", actionEmptyFrame),
    ),
  );

  buttons.action.data.action.setValue(Flow.noop)(scene);
  const actionButtonFlow = Flow.parallel(
    Flow.observe(
      buttons.action.events.bindAction.subject,
      ({ action, frameKey }) =>
        Flow.call(
          combineContext(
            () => buttons.action.getObj(scene).setFrame(frameKey),
            buttons.action.data.action.setValue(action),
          ),
        ),
    ),
    Flow.observe(buttons.action.events.unbindAction.subject, () =>
      Flow.call(
        combineContext(
          () => buttons.action.getObj(scene).setFrame(actionEmptyFrame),
          buttons.action.data.action.setValue(Flow.noop),
        ),
      ),
    ),
    Flow.observe(commonGoEvents.pointerdown(buttons.action.key).subject, () =>
      buttons.action.data.action.value(scene),
    ),
  );
  Flow.run(scene, actionButtonFlow);
};

export const bindActionButton = (
  condition: Observable<boolean>,
  params: BindActionParams,
) =>
  Flow.observe(
    condition.pipe(startWith(false), pairwise()),
    ([previous, value]) => {
      if (previous === value) return Flow.noop;
      return Flow.call(
        value
          ? buttons.action.events.bindAction.emit(params)
          : buttons.action.events.unbindAction.emit({}),
      );
    },
  );
