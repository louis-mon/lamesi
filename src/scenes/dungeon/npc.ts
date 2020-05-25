import * as Phaser from "phaser";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import { map, tap } from "rxjs/operators";
import * as Def from "./definitions";

import Vector2 = Phaser.Math.Vector2;
import {
  createSpriteAt,
  SceneContext,
  createImageAt,
} from "/src/helpers/phaser";
import { bindActionButton, bindSkillButton } from "./menu";
import { combineLatest, Observable } from "rxjs";
import {
  commonGoEvents,
  defineGoClass,
  declareGoInstance,
} from "/src/helpers/component";
import _ from "lodash";
import { annotate } from "/src/helpers/typing";
import { combineContext } from "/src/helpers/functional";

export const createNpcAnimations = (scene: Phaser.Scene) => {
  scene.anims.create({
    key: "switch",
    duration: 500,
    frames: scene.anims.generateFrameNames("npc", {
      start: 0,
      end: 4,
      prefix: "switch-",
    }),
  });
};

const canPlayerDoAction = (params: {
  pos: Wp.WpId;
  disabled: SceneContext<Observable<boolean>>;
}) => (scene: Phaser.Scene) =>
  combineLatest([
    Def.player.data.currentPos.subject(scene),
    Def.player.data.isMoving.subject(scene),
    params.disabled(scene),
  ]).pipe(
    map(
      ([pos, isMoving, disabled]) =>
        !disabled && !isMoving && pos === params.pos,
    ),
  );

export const switchCrystalFactory = (scene: Phaser.Scene) => {
  return (def: Def.SwitchCrystalDef) => {
    const obj = def
      .create(
        createSpriteAt(
          scene,
          Wp.wpPos(def.config.wp).add(def.config.offset),
          "npc",
          "switch-0",
        ),
      )
      .setDepth(Def.depths.npc);
    const stateData = def.data.state;
    stateData.setValue(false)(scene);
    Flow.run(
      scene,
      Flow.parallel(
        bindActionButton(
          canPlayerDoAction({
            pos: Wp.getWpId(def.config.wp),
            disabled: stateData.dataSubject,
          })(scene),
          {
            action: Flow.sequence(
              Flow.call(() => obj.anims.play("switch")),
              Flow.wait(commonGoEvents.animationcomplete(obj.name).subject),
              Flow.call(stateData.setValue(true)),
            ),
            key: "activate-switch",
            create: ({ pos }) => (scene) =>
              createSpriteAt(scene, pos, "menu", "action-attack"),
          },
        ),
        Flow.observe(stateData.subject, (value) =>
          value ? Flow.noop : Flow.call(() => obj.anims.playReverse("switch")),
        ),
      ),
    );
  };
};

const doors = {
  door4To5: Wp.getWpLink(4, 5),
  door4To3: Wp.getWpLink(4, 3),
  door4To1: Wp.getWpLink(4, 1),
  door5To2: Wp.getWpLink(5, 2),
  door3To0: Wp.getWpLink(3, 0),
};

type DoorKey = keyof typeof doors;

const doorObjectKey = (doorKey: DoorKey, pos: number) => `${doorKey}-${pos}`;
const isDoorHorizontal = (doorKey: DoorKey): boolean =>
  Wp.getWpDef(doors[doorKey].wp1).x === Wp.getWpDef(doors[doorKey].wp2).x;

export const openDoor = (doorKey: DoorKey): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const doorDef = doors[doorKey];
    return Flow.sequence(
      Flow.parallel(
        ...[0, 1].map((i) => {
          const doorObj = scene.children.getByName(
            doorObjectKey(doorKey, i),
          ) as Phaser.GameObjects.Sprite;
          const coord = isDoorHorizontal(doorKey) ? "x" : "y";
          return Flow.tween({
            targets: doorObj,
            props: { [coord]: doorObj[coord] - 40 * (i * 2 - 1) },
            duration: 750,
          });
        }),
      ),
      Flow.call(
        Wp.setGraphLinkData({
          ...doorDef,
          open: true,
        }),
      ),
    );
  });

const doorSepBase = new Vector2(0, 33);
export const createDoors = (scene: Phaser.Scene) => {
  _.mapValues(doors, (doorDef, doorKey: DoorKey) => {
    const wp1 = Wp.wpPos(Wp.getWpDef(doorDef.wp1));
    const wp2 = Wp.wpPos(Wp.getWpDef(doorDef.wp2));
    const middlePos = wp1.clone().add(wp2).scale(0.5);
    const doorSep = isDoorHorizontal(doorKey)
      ? doorSepBase.clone().rotate(Math.PI / 2)
      : doorSepBase;
    const points = [
      middlePos.clone().add(doorSep),
      middlePos.clone().subtract(doorSep),
    ];
    points.forEach((point, i) =>
      createSpriteAt(scene, point, "npc", "door-vertical")
        .setName(doorObjectKey(doorKey, i))
        .setDepth(Def.depths.npc),
    );
  });
};

type AltarComponentParams = {
  wp: Wp.WpDef;
  createItem: (p: {
    pos: Vector2;
  }) => (scene: Phaser.Scene) => Phaser.GameObjects.Sprite;
  key: string;
  action: Flow.PhaserNode;
};

const altarClass = defineGoClass({
  data: { isCurrentlyUsed: annotate<boolean>() },
  events: {},
  kind: annotate<Phaser.GameObjects.Sprite>(),
});

export const altarComponent = (params: AltarComponentParams) => {
  const altarKey = `altar-${params.key}-altar`;
  const itemKey = `altar-${params.key}-item`;
  const itemDef = declareGoInstance(altarClass, itemKey);
  const basePos = Wp.wpPos(params.wp);
  const hasThisSkill: SceneContext<Observable<boolean>> = (scene) =>
    Def.scene.data.currentSkill
      .dataSubject(scene)
      .pipe(map((currentSkill) => currentSkill === params.key));
  const activateAltar: Flow.PhaserNode = Flow.lazy((scene) =>
    Flow.sequence(
      Flow.call(() => {
        createSpriteAt(
          scene,
          basePos.clone().add(new Vector2(0, -20)),
          "npc",
          "altar",
        )
          .setDepth(Def.depths.npc)
          .setName(altarKey)
          .setScale(1, 0);
      }),
      Flow.tween(() => ({
        targets: altarClass.getObj(altarKey)(scene),
        props: { scaleY: 1 },
        duration: 300,
      })),
      Flow.call(() =>
        itemDef.create(
          params
            .createItem({ pos: basePos.clone().add(new Vector2(0, -55)) })(
              scene,
            )
            .setDepth(Def.depths.floating)
            .setScale(0),
        ),
      ),
      Flow.lazy(() =>
        Flow.parallel(
          Flow.sequence(
            Flow.tween({
              targets: altarClass.getObj(itemKey)(scene),
              props: { scale: 0.65 },
              duration: 500,
            }),
            Flow.tween({
              targets: altarClass.getObj(itemKey)(scene),
              props: { y: basePos.y - 42 },
              duration: 1500,
              ease: "Cubic.InOut",
              loop: -1,
              yoyo: true,
            }),
          ),
          bindSkillButton(hasThisSkill(scene), {
            key: itemKey,
            create: params.createItem,
            action: params.action,
          }),
          bindActionButton(
            canPlayerDoAction({
              pos: Wp.getWpId(params.wp),
              disabled: hasThisSkill,
            })(scene),
            {
              key: "action-take-item",
              create: ({ pos }) => (scene) =>
                createImageAt(scene, pos, "menu", "action-take"),
              action: Flow.call(
                combineContext(
                  Def.scene.data.currentSkill.setValue(params.key),
                  (scene) =>
                    altarClass.getObj(itemKey)(scene).setVisible(false),
                ),
              ),
            },
          ),
        ),
      ),
    ),
  );
  return {
    activateAltar,
  };
};
