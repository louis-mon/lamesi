import * as Phaser from "phaser";
import { Maybe } from "purify-ts";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import { menuHelpers } from "../menu";
import * as globalEvents from "/src/scenes/global-events";
import {
  defineGoClass,
  customEvent,
  declareGoInstances,
  commonGoEvents,
  spriteClassKind,
  defineSceneClass,
} from "/src/helpers/component";
import { annotate, ValueOf } from "/src/helpers/typing";
import { combineContext, FuncOrConst } from "/src/helpers/functional";
import { Observable, fromEvent, of } from "rxjs";
import { startWith, pairwise } from "rxjs/operators";
import {
  getObjectPosition,
  ManipulableObject,
  placeAt,
} from "/src/helpers/phaser";
import _, { remove } from "lodash";
import { gameWidth, gameHeight } from "../common";

const actionEmptyFrame = "action-empty";

type BindActionParams = {
  action: Flow.PhaserNode;
  key: string;
  disabled?: Observable<boolean>;
  hintKey: keyof typeof globalEvents.events;
  create: (params: {
    pos: Phaser.Math.Vector2;
  }) => (scene: Phaser.Scene) => ManipulableObject;
};

type BindActionState = Pick<BindActionParams, "action" | "key" | "disabled">;

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

const menuSceneClass = defineSceneClass({
  events: {
    removeShadow: customEvent<{ activated: boolean }>(),
  },
  data: {},
});

const showShadowRect = ({
  hintKey,
  targetPos,
}: {
  hintKey: keyof typeof globalEvents.events;
  targetPos: Phaser.Math.Vector2;
}): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    if (globalEvents.events[hintKey].value(scene)) return Flow.noop;

    const pointerCircle = scene.add.graphics();
    pointerCircle.fillCircle(0, 0, 200).setVisible(false);
    const pointerCircleMask = pointerCircle.createGeometryMask();
    pointerCircleMask.invertAlpha = true;
    const shadowRect = scene.add
      .rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, 0, 0)
      .setDepth(200)
      .setMask(pointerCircleMask);
    return Flow.withBackground({
      main: Flow.whenValueDo({
        condition: menuSceneClass.events.removeShadow.subject,
        action: ({ activated }) =>
          Flow.call(() => {
            if (activated) {
              globalEvents.events[hintKey].setValue(true)(scene);
            }
            shadowRect.destroy();
            pointerCircle.destroy();
            pointerCircleMask.destroy();
          }),
      }),
      back: Flow.sequence(
        Flow.call(() => {
          placeAt(pointerCircle, targetPos);
        }),
        Flow.parallel(
          Flow.tween({
            targets: shadowRect,
            props: { fillAlpha: 0.8 },
            duration: 400,
          }),
          Flow.tween({
            targets: pointerCircle,
            props: { scale: 0.3 },
            duration: 400,
          }),
        ),
      ),
    });
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
    let buttonDisabled: boolean = false;

    const fireButtonAction = () =>
      buttonDisabled
        ? Flow.noop
        : Flow.sequence(
            Flow.call(menuSceneClass.events.removeShadow.emit({ activated: true })),
            Flow.withContext(
              () => scene,
              button.data.action.value(menuScene).action,
            ),
          );
    const shortcutKey = menuScene.input.keyboard.addKey(button.config.shortcut);
    const buttonObj = button.getObj(menuScene);
    menuScene.add
      .text(
        buttonObj.getBottomRight().x - 15,
        buttonObj.getBottomRight().y - 10,
        button.config.shortcut,
      )
      .setFontSize(25);
    const getButtonActionObj = (key: string) =>
      spriteClassKind.getObj(buttonKey(key))(menuScene);

    return Flow.parallel(
      Flow.observeSentinel(button.data.action.subject, ({ disabled, key }) =>
        disabled
          ? Flow.observe(disabled, (isDisabled) =>
              Flow.call(() => {
                buttonDisabled = isDisabled;
                Maybe.fromNullable(getButtonActionObj(key)).ifJust(
                  (obj) => (obj.alpha = isDisabled ? 0.5 : 1),
                );
              }),
            )
          : Flow.noop,
      ),
      Flow.observe(
        button.events.bindAction.subject,
        ({ action, create, key, disabled, hintKey }) =>
          Flow.sequence(
            Flow.call(() => {
              buttonDisabled = false;
            }),
            Flow.call(
              combineContext(
                () =>
                  create({ pos: getObjectPosition(buttonObj) })(menuScene)
                    .setScale(1.3)
                    .setName(buttonKey(key)),
                button.data.action.setValue({ action, key, disabled }),
              ),
            ),
            Flow.tween(() => ({
              targets: getButtonActionObj(key),
              props: { scale: 1 },
              duration: 500,
            })),
            showShadowRect({
              hintKey,
              targetPos: getObjectPosition(buttonObj),
            }),
          ),
      ),
      Flow.observe(button.events.unbindAction.subject, ({ key }) =>
        Flow.sequence(
          Flow.call(menuSceneClass.events.removeShadow.emit({ activated: false })),
          Flow.call(
            combineContext(
              () => getButtonActionObj(key)!.destroy(),
              button.data.action.updateValue((oldAction) =>
                oldAction.key === key ? emptyAction : oldAction,
              ),
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
