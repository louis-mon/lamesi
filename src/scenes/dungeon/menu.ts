import * as Phaser from "phaser";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import { menuHelpers } from "../menu";
import {
  defineGoClass,
  customEvent,
  declareGoInstances,
  commonGoEvents,
} from "/src/helpers/component";
import { annotate, ValueOf } from "/src/helpers/typing";
import { combineContext, FuncOrConst } from "/src/helpers/functional";
import { Observable, fromEvent } from "rxjs";
import { startWith, pairwise } from "rxjs/operators";
import { getObjectPosition, ManipulableObject } from "/src/helpers/phaser";
import _ from "lodash";

const actionEmptyFrame = "action-empty";

type BindActionParams = {
  action: Flow.PhaserNode;
  key: string;
  create: (params: {
    pos: Phaser.Math.Vector2;
  }) => (scene: Phaser.Scene) => ManipulableObject;
};

type BindActionState = Pick<BindActionParams, "action" | "key">;

const buttonKey = (key: string) => `menu-button-${key}`;

const menuButtonClass = defineGoClass({
  events: {
    bindAction: customEvent<BindActionParams>(),
    unbindAction: customEvent<BindActionParams>(),
  },
  data: { action: annotate<BindActionState>() },
  kind: annotate<Phaser.GameObjects.Sprite>(),
  config: annotate<{ shortcut: string }>(),
});

const emptyAction: BindActionState = {
  action: Flow.noop,
  key: "",
};

const buttons = declareGoInstances(menuButtonClass, "buttons", {
  skill: { shortcut: "A" },
  action: { shortcut: "E" },
});

export const makeMenu = (scene: Phaser.Scene) => {
  const menuScene = menuHelpers.getMenuScene(scene);

  const buttonsFlow = [buttons.skill, buttons.action].map((button) => {
    button.create(
      menuScene.addRightButton(({ x, y }) =>
        menuScene.add.sprite(x, y, "menu", actionEmptyFrame),
      ),
    );
    button.data.action.setValue(emptyAction)(menuScene);
    const fireButtonAction = () =>
      Flow.withContext(() => scene, button.data.action.value(menuScene).action);
    const shortcutKey = menuScene.input.keyboard.addKey(button.config.shortcut);
    const buttonObj = button.getObj(menuScene);
    menuScene.add
      .text(
        buttonObj.getBottomRight().x - 15,
        buttonObj.getBottomRight().y - 10,
        button.config.shortcut,
      )
      .setFontSize(25);
    return Flow.parallel(
      Flow.observe(
        button.events.bindAction.subject,
        ({ action, create, key }) =>
          Flow.sequence(
            Flow.call(
              combineContext(
                () =>
                  create({ pos: getObjectPosition(buttonObj) })(menuScene)
                    .setScale(1.3)
                    .setName(buttonKey(key)),
                button.data.action.setValue({ action, key }),
              ),
            ),
            Flow.tween(() => ({
              targets: menuScene.children.getByName(buttonKey(key)),
              props: { scale: 1 },
              duration: 500,
            })),
          ),
      ),
      Flow.observe(button.events.unbindAction.subject, ({ key }) =>
        Flow.call(
          combineContext(
            () => menuScene.children.getByName(buttonKey(key))!.destroy(),
            button.data.action.updateValue((oldAction) =>
              oldAction.key === key ? emptyAction : oldAction,
            ),
          ),
        ),
      ),
      Flow.observe(fromEvent(shortcutKey, "down"), fireButtonAction),
      Flow.observe(
        commonGoEvents.pointerdown(button.key).subject,
        fireButtonAction,
      ),
    );
  });
  Flow.run(menuScene, Flow.parallel(...buttonsFlow));
};

const bindMenuButton = (button: ValueOf<typeof buttons>) => (
  condition: Observable<boolean>,
  params: BindActionParams,
) =>
  Flow.observe(
    condition.pipe(startWith(false), pairwise()),
    ([previous, value]) => {
      if (previous === value) return Flow.noop;
      return Flow.withContext(
        menuHelpers.getMenuScene,
        Flow.call(
          value
            ? button.events.bindAction.emit(params)
            : button.events.unbindAction.emit(params),
        ),
      );
    },
  );

export const bindActionButton = bindMenuButton(buttons.action);
export const bindSkillButton = bindMenuButton(buttons.skill);
