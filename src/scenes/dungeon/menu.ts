import * as Phaser from "phaser";
import { Maybe } from "purify-ts";
import * as Flow from "/src/helpers/phaser-flow";
import {
  commonGoEvents,
  customEvent,
  declareGoInstances,
  defineGoClass,
  defineSceneClass,
  spriteClassKind,
} from "/src/helpers/component";
import { annotate, ValueOf } from "/src/helpers/typing";
import { combineContext } from "/src/helpers/functional";
import { fromEvent, Observable } from "rxjs";
import { pairwise, startWith } from "rxjs/operators";
import {
  getObjectPosition,
  ManipulableObject,
  placeAt,
} from "/src/helpers/phaser";
import { gameHeight, gameWidth } from "../common/constants";
import { menuHelpers } from "/src/scenes/menu/menu-scene-def";
import {
  MenuHintGlobalDataKey,
  otherGlobalData,
} from "/src/scenes/common/global-data";
import { uiBuilder } from "/src/helpers/ui/ui-builder";
import { tr } from "/src/i18n/i18n";
import { DottedKey } from "/src/i18n/keys";
import * as Wp from "/src/scenes/dungeon/wp";
import * as sceneDef from "./definitions";
import Vector2 = Phaser.Math.Vector2;

const actionEmptyFrame = "action-empty";

type BindActionParams = {
  action: Flow.PhaserNode;
  key: string;
  disabled?: Observable<boolean>;
  hintKey: MenuHintGlobalDataKey;
  create: (params: {
    pos: Phaser.Math.Vector2;
  }) => (scene: Phaser.Scene) => ManipulableObject;
};

type BindActionState = Pick<BindActionParams, "action" | "key" | "disabled">;

const buttonKey = (key: string) => `menu-button-${key}`;

type ButtonConfig = { shortcut: string };

const menuButtonClass = defineGoClass({
  events: {
    bindAction:
      customEvent<{ params: BindActionParams; config: ButtonConfig }>(),
    unbindAction: customEvent<BindActionParams>(),
  },
  data: { action: annotate<BindActionState>() },
  kind: annotate<Phaser.GameObjects.Sprite>(),
  config: annotate<ButtonConfig>(),
});

const emptyAction: BindActionState = {
  action: Flow.noop,
  key: "",
};

const buttons = declareGoInstances(menuButtonClass, "buttons", {
  skill: { shortcut: "A" },
  action: { shortcut: "E" },
});

export const menuSceneClass = defineSceneClass({
  events: {
    removeShadow: customEvent<{ activated: boolean }>(),
    goToButton: customEvent<{ item: ManipulableObject; key: string }>(),
  },
  data: {},
});

const hintKeyAction: Record<MenuHintGlobalDataKey, DottedKey> = {
  dungeonActivateHint: "dungeon.activateSwitch",
  dungeonSkillHint: "dungeon.useItem",
  dungeonTakeHint: "dungeon.takeItem",
};

const showShadowRect = ({
  hintKey,
  targetPos,
  config: { shortcut },
}: {
  hintKey: MenuHintGlobalDataKey;
  targetPos: Phaser.Math.Vector2;
  config: ButtonConfig;
}): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    if (otherGlobalData[hintKey].value(scene)) return Flow.noop;

    const ui = uiBuilder(scene);
    const pointerCircle = scene.add.graphics();
    pointerCircle.fillCircle(0, 0, 200).setVisible(false);
    const pointerCircleMask = pointerCircle.createGeometryMask();
    pointerCircleMask.invertAlpha = true;
    const shadowRect = scene.add
      .rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, 0, 0)
      .setDepth(200)
      .setMask(pointerCircleMask);
    const hintDialog = ui
      .dialog(() => ({
        background: ui.containerBack(),
        content: ui.bodyText(
          tr(hintKeyAction[hintKey], {
            key: shortcut,
          }),
        ),
        orientation: "vertical",
        actions: [ui.button({ text: tr("general.ok") })],
      }))
      .layout();
    hintDialog.on("button.click", () => hintDialog.fadeOutDestroy(500));
    hintDialog.setDepth(shadowRect.depth + 1, false);
    return Flow.withBackground({
      main: Flow.whenValueDo({
        condition: menuSceneClass.events.removeShadow.subject,
        action: ({ activated }) =>
          Flow.call(() => {
            if (activated) {
              otherGlobalData[hintKey].setValue(true)(scene);
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

  const getButtonActionObj = (key: string) =>
    spriteClassKind.getObj(buttonKey(key))(menuScene);

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
            Flow.call(
              menuSceneClass.events.removeShadow.emit({ activated: true }),
            ),
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
        ({ params: { action, create, key, disabled, hintKey }, config }) =>
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
            Flow.call(() => {
              const item = create({
                pos: Wp.wpPos(
                  Wp.getWpDef(sceneDef.player.data.currentPos.value(scene)),
                ).add(new Vector2(0, -30)),
              })(menuScene);
              menuSceneClass.events.goToButton.emit({
                item,
                key,
              })(menuScene);
            }),
            Flow.parallel(
              Flow.tween(() => ({
                targets: getButtonActionObj(key),
                props: { scale: 1 },
                duration: 500,
              })),
              showShadowRect({
                hintKey,
                targetPos: getObjectPosition(buttonObj),
                config,
              }),
            ),
          ),
      ),
      Flow.observe(button.events.unbindAction.subject, ({ key }) =>
        Flow.sequence(
          Flow.call(
            menuSceneClass.events.removeShadow.emit({ activated: false }),
          ),
          Flow.call(
            combineContext(
              () =>
                Maybe.fromNullable(getButtonActionObj(key)).ifJust((button) =>
                  button.destroy(),
                ),
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

  const goToItemFlow: Flow.PhaserNode = Flow.observe(
    menuSceneClass.events.goToButton.subject,
    ({ item, key }) =>
      Flow.sequence(
        Flow.tween({
          targets: item,
          props: { scale: 1.3 },
          duration: 100,
        }),
        Flow.tween({
          targets: item,
          props: { scale: 1 },
          duration: 500,
        }),
        Flow.moveTo({
          dest: getObjectPosition(getButtonActionObj(key)),
          target: item,
          speed: 2000,
        }),
        Flow.call(() => item.destroy()),
      ),
  );

  Flow.run(menuScene, Flow.parallel(...buttonsFlow, goToItemFlow));
};

const bindMenuButton =
  (button: ValueOf<typeof buttons>) =>
  (condition: Observable<boolean>, params: BindActionParams): Flow.PhaserNode =>
    Flow.withCleanup({
      flow: Flow.observe(
        condition.pipe(startWith(false), pairwise()),
        ([previous, value]) => {
          if (previous === value) return Flow.noop;
          return Flow.withContext(
            menuHelpers.getMenuScene,
            Flow.call(
              value
                ? button.events.bindAction.emit({
                    params,
                    config: button.config,
                  })
                : button.events.unbindAction.emit(params),
            ),
          );
        },
      ),
      cleanup: (scene) =>
        button.events.unbindAction.emit(params)(
          menuHelpers.getMenuScene(scene),
        ),
    });

export const bindActionButton = bindMenuButton(buttons.action);
export const bindSkillButton = bindMenuButton(buttons.skill);
