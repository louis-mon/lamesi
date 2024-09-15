import * as Phaser from "phaser";
import { playerCannotActSubject } from "./definitions";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import { map } from "rxjs/operators";
import * as Def from "./definitions";

import Vector2 = Phaser.Math.Vector2;
import {
  createSpriteAt,
  SceneContext,
  createImageAt,
  getObjectPosition,
} from "/src/helpers/phaser";
import { bindActionButton } from "./menu";
import { BehaviorSubject, combineLatest, Observable, of } from "rxjs";
import {
  commonGoEvents,
  defineGoClass,
  declareGoInstance,
} from "/src/helpers/component";
import _ from "lodash";
import { annotate } from "/src/helpers/typing";
import { combineContext } from "/src/helpers/functional";
import { GlobalDataKey } from "/src/scenes/common/global-data";
import { getEventDef, isEventSolved } from "/src/scenes/common/events-def";
import { globalEvents } from "/src/scenes/common/global-events";

const createNpcAnimations = (scene: Phaser.Scene) => {
  scene.anims.create({
    key: "switch",
    duration: 300,
    frames: scene.anims.generateFrameNames("npc", {
      start: 0,
      end: 3,
      prefix: "switch-",
    }),
  });
};

export const initNpc: SceneContext<void> = (scene) => {
  createNpcAnimations(scene);
  Def.scene.data.interactableGroup.setValue(scene.physics.add.group())(scene);
  Def.scene.data.shieldGroup.setValue(scene.physics.add.group())(scene);
  Def.scene.data.wallGroup.setValue(scene.physics.add.staticGroup())(scene);
};

const canPlayerDoAction =
  (params: { pos: Wp.WpId; disabled: SceneContext<Observable<boolean>> }) =>
  (scene: Phaser.Scene) =>
    combineLatest([
      Def.player.data.currentPos.dataSubject(scene),
      Def.player.data.isMoving.dataSubject(scene),
      playerCannotActSubject(scene),
      params.disabled(scene),
    ]).pipe(
      map(
        ([pos, isMoving, cannotAct, disabled]) =>
          !disabled && !isMoving && !cannotAct && pos === params.pos,
      ),
    );
export const bindAttackButton = ({
  pos,
  disabled = () => of(false),
  action,
  target,
}: {
  pos: Def.WpId;
  disabled?: SceneContext<Observable<boolean>>;
  action: Flow.PhaserNode;
  target: Phaser.GameObjects.Components.Transform;
}): Flow.PhaserNode =>
  Flow.lazy((scene) =>
    bindActionButton(
      canPlayerDoAction({
        pos,
        disabled,
      })(scene),
      {
        hintKey: "dungeonActivateHint",
        action: Flow.parallel(
          Flow.call(Def.scene.events.attackPlayer.emit({ target })),
          action,
        ),
        key: `activate-attack-${pos}`,
        create:
          ({ pos }) =>
          (scene) =>
            createSpriteAt(scene, pos, "menu", "action-attack"),
      },
    ),
  );

export const switchCrystalFactory = (scene: Phaser.Scene) => {
  return (def: Def.SwitchCrystalDef) => {
    const switchWaveAnim = () => {
      const sprite = createSpriteAt(
        scene,
        getObjectPosition(def.getObj(scene)),
        "npc",
        "switch-wave",
      );
      sprite.scale = 0.1;
      sprite.y -= 10;
      scene.tweens.add({
        targets: sprite,
        props: { scale: 1.5, alpha: 0 },
        duration: 600,
        onComplete: () => sprite.destroy(),
      });
    };

    let transitioning = false;
    const playTransition = (anim: Flow.PhaserNode, toState: boolean) => () => {
      if (def.data.state.value(scene) !== toState && !transitioning) {
        transitioning = true;
        return Flow.sequence(
          anim,
          Flow.wait(commonGoEvents.animationcomplete(obj.name).subject),
          Flow.call(
            combineContext(stateData.setValue(toState), () => {
              transitioning = false;
            }),
          ),
        );
      }
      return Flow.noop;
    };
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
    Def.scene.data.interactableGroup.updateValue((group) => group.add(obj))(
      scene,
    );
    const stateData = def.data.state;
    stateData.setValue(false)(scene);
    Flow.run(
      scene,
      Flow.parallel(
        bindAttackButton({
          target: def.getObj(scene),
          pos: Wp.getWpId(def.config.wp),
          disabled: def.config.deactivable ? undefined : stateData.dataSubject,
          action: Flow.call(() =>
            (stateData.value(scene)
              ? def.events.deactivateSwitch.emit({ feedback: true })
              : def.events.activateSwitch.emit({}))(scene),
          ),
        }),
        Flow.observe(Def.interactableEvents.hitPhysical(obj.name).subject, () =>
          Flow.call(def.events.activateSwitch.emit({})),
        ),
        Flow.observe(
          def.events.activateSwitch.subject,
          playTransition(
            Flow.call(() => {
              switchWaveAnim();
              scene.sound.play("switch-activate");
              obj.anims.play("switch");
            }),
            true,
          ),
        ),
        Flow.observe(def.events.deactivateSwitch.subject, ({ feedback }) =>
          playTransition(
            Flow.call(() => {
              if (feedback) {
                scene.sound.play("switch-deactivate");
              }
              obj.anims.playReverse("switch");
            }),
            false,
          )(),
        ),
      ),
    );
  };
};

const doors = {
  door1to2: Wp.getWpLink(1, 2),
  door4To5: Wp.getWpLink(4, 5),
  door4To3: Wp.getWpLink(4, 3),
  door4To1: Wp.getWpLink(4, 1),
  door5To2: Wp.getWpLink(5, 2),
  door3To0: Wp.getWpLink(3, 0),
};

export type DoorKey = keyof typeof doors;

const doorObjectKey = (doorKey: DoorKey, pos: number) => `${doorKey}-${pos}`;
const isDoorHorizontal = (doorKey: DoorKey): boolean =>
  Wp.getWpDef(doors[doorKey].wp1).x === Wp.getWpDef(doors[doorKey].wp2).x;

const doorSepBase = new Vector2(0, 33);
const doorPositions = (doorKey: DoorKey, open: boolean) => {
  const doorDef = doors[doorKey];
  const wp1 = Wp.wpPos(Wp.getWpDef(doorDef.wp1));
  const wp2 = Wp.wpPos(Wp.getWpDef(doorDef.wp2));
  const middlePos = wp1.clone().add(wp2).scale(0.5);
  const doorSep = (
    isDoorHorizontal(doorKey)
      ? doorSepBase.clone().rotate(Math.PI / 2)
      : doorSepBase
  )
    .clone()
    .scale(open ? 2 : 1);
  return [middlePos.clone().add(doorSep), middlePos.clone().subtract(doorSep)];
};

export const doorCenterPos = (doorKey: DoorKey) =>
  doorPositions(doorKey, false)
    .reduce((acc, p) => acc.add(p))
    .scale(0.5);

const activateDoor =
  (open: boolean) =>
  (doorKey: DoorKey): Flow.PhaserNode =>
    Flow.lazy((scene) => {
      const doorDef = doors[doorKey];
      const actions: Flow.PhaserNode[] = [
        Flow.parallel(
          ...doorPositions(doorKey, open).map(({ x, y }, i) => {
            const doorObj = scene.children.getByName(
              doorObjectKey(doorKey, i),
            ) as Phaser.GameObjects.Sprite;
            return Flow.tween({
              targets: doorObj,
              props: { x, y },
              duration: 750,
            });
          }),
        ),
        Flow.call(
          Wp.setGroundObstacleLink({
            ...doorDef,
            kind: open ? "none" : "wall",
          }),
        ),
      ];
      return Flow.sequence(...(open ? actions : actions.slice().reverse()));
    });

export const openDoor = activateDoor(true);

export const closeDoor = activateDoor(false);

export const createDoors = (scene: Phaser.Scene) => {
  _.mapValues(doors, (doorDef, doorKey: DoorKey) => {
    Wp.setGroundObstacleLink({
      ...doorDef,
      kind: "wall",
    })(scene);
    doorPositions(doorKey, false).forEach((point, i) => {
      const door = createSpriteAt(scene, point, "npc", "door-vertical")
        .setName(doorObjectKey(doorKey, i))
        .setDepth(Def.depths.npc);
      if (i === 0) {
        door.setFlipY(true);
      }
      if (isDoorHorizontal(doorKey)) {
        door.setAngle(90);
      }
    });
  });
};

type AltarComponentParams = {
  wp: Wp.WpDef;
  createItem: (p: {
    pos: Vector2;
  }) => (scene: Phaser.Scene) => Phaser.GameObjects.Image;
  key: string;
  isEmpty?: SceneContext<Observable<boolean>>;
  action: Flow.PhaserNode;
  infinite?: boolean;
};

const altarClass = defineGoClass({
  data: {},
  events: {},
  kind: annotate<Phaser.GameObjects.Image>(),
});

export const altarComponent = (
  params: AltarComponentParams,
): Flow.PhaserNode => {
  const altarKey = `altar-${params.key}-${Wp.getWpId(params.wp)}-altar`;
  const itemKey = `altar-${params.key}-${Wp.getWpId(params.wp)}-item`;
  const itemDef = declareGoInstance(altarClass, itemKey);
  const basePos = Wp.wpPos(params.wp);
  return Flow.lazy((scene) => {
    const objectTaken = new BehaviorSubject(false);
    const isAltarEmpty: SceneContext<Observable<boolean>> = (scene) =>
      combineLatest([objectTaken, params.isEmpty?.(scene) ?? of(false)]).pipe(
        map((arr) => arr.some((x) => x)),
      );
    return Flow.sequence(
      Flow.call(() => {
        createSpriteAt(
          scene,
          basePos.clone().add(new Vector2(0, -25)),
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
            .createItem({ pos: basePos.clone().add(new Vector2(0, -60)) })(
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
            Flow.call(
              Def.scene.events.altarAppeared.emit({
                at: Wp.getWpId(params.wp),
              }),
            ),
            Flow.tween({
              targets: altarClass.getObj(itemKey)(scene),
              props: { y: basePos.y - 50 },
              duration: 1500,
              ease: "Cubic.InOut",
              loop: -1,
              yoyo: true,
            }),
          ),
          Flow.observe(isAltarEmpty, (isEmpty) =>
            Flow.call((scene) =>
              altarClass.getObj(itemKey)(scene).setVisible(!isEmpty),
            ),
          ),
          bindActionButton(
            canPlayerDoAction({
              pos: Wp.getWpId(params.wp),
              disabled: isAltarEmpty,
            })(scene),
            {
              hintKey: "dungeonTakeHint",
              key: "action-take-item",
              create:
                ({ pos }) =>
                (scene) =>
                  createImageAt(scene, pos, "menu", "action-take"),
              action: Flow.sequence(
                params.infinite
                  ? Flow.noop
                  : Flow.call(() => objectTaken.next(true)),
                params.action,
              ),
            },
          ),
        ),
      ),
    );
  });
};

export const endGoalAltarPlaceholder = (params: {
  eventToSolve: GlobalDataKey;
  wp: Wp.WpDef;
}): Flow.PhaserNode =>
  altarComponent({
    isEmpty: (scene) => of(isEventSolved(params.eventToSolve)(scene)),
    createItem:
      ({ pos }) =>
      (scene) =>
        getEventDef(params.eventToSolve).createItem({ pos, scene }),
    key: "goal-altar",
    wp: params.wp,
    action: Flow.sequence(
      Flow.waitTimer(2000),
      Flow.call(
        globalEvents.endEventAnim.emit({
          dataSolved: params.eventToSolve,
        }),
      ),
    ),
  });
