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
import { Observable } from "rxjs";
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

const buttonKey = (key: string) => `menu-button-${key}`;

const menuButtonClass = defineGoClass({
  events: {
    bindAction: customEvent<BindActionParams>(),
    unbindAction: customEvent<BindActionParams>(),
  },
  data: { action: annotate<Flow.PhaserNode>() },
  kind: annotate<Phaser.GameObjects.Sprite>(),
});

const buttons = declareGoInstances(menuButtonClass, "buttons", {
  skill: {},
  action: {},
});

export const makeMenu = (scene: Phaser.Scene) => {
  const menuScene = menuHelpers.getMenuScene(scene);

  const buttonsFlow = [buttons.skill, buttons.action].map((button) => {
    button.create(
      menuScene.addRightButton(({ x, y }) =>
        menuScene.add.sprite(x, y, "menu", actionEmptyFrame),
      ),
    );
    button.data.action.setValue(Flow.noop)(menuScene);
    return Flow.parallel(
      Flow.observe(
        button.events.bindAction.subject,
        ({ action, create, key }) =>
          Flow.sequence(
            Flow.call(
              combineContext(
                () =>
                  create({ pos: getObjectPosition(button.getObj(menuScene)) })(
                    menuScene,
                  )
                    .setScale(1.3)
                    .setName(buttonKey(key)),
                button.data.action.setValue(action),
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
            button.data.action.setValue(Flow.noop),
          ),
        ),
      ),
      Flow.observe(commonGoEvents.pointerdown(button.key).subject, () =>
        Flow.withContext(() => scene, button.data.action.value(menuScene)),
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
