import * as Phaser from "phaser";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import { map, tap } from "rxjs/operators";
import * as Def from "./definitions";

import Vector2 = Phaser.Math.Vector2;
import { createSpriteAt } from "/src/helpers/phaser";
import { bindActionButton } from "./menu";
import { combineLatest } from "rxjs";
import { commonGoEvents } from "/src/helpers/component";

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
          combineLatest([
            Def.player.data.currentPos.subject(scene),
            Def.player.data.isMoving.subject(scene),
            stateData.dataSubject(scene),
          ]).pipe(
            map(
              ([pos, isMoving, isSwitchActive]) =>
                !isMoving &&
                pos === Wp.getWpId(def.config.wp) &&
                !isSwitchActive,
            ),
          ),
          {
            action: Flow.sequence(
              Flow.call(() => obj.anims.play("switch")),
              Flow.wait(commonGoEvents.animationcomplete(obj.name).subject),
              Flow.call(stateData.setValue(true)),
            ),
            key: "activate-switch",
            create: (pos) => (scene) =>
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

const doorDef = {
  wp1: { room: 4, x: 4, y: 2 },
  wp2: { room: 5, x: 0, y: 2 },
  key: "door-4-5",
};

const doorObjectKey = (doorKey: string, pos: number) => `${doorKey}-${pos}`;

export const openDoor = (): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    return Flow.sequence(
      Flow.parallel(
        ...[0, 1].map((i) => {
          const door = scene.children.getByName(
            doorObjectKey(doorDef.key, i),
          ) as Phaser.GameObjects.Sprite;
          return Flow.tween({
            targets: door,
            props: { y: door.y - 40 * (i * 2 - 1) },
            duration: 750,
          });
        }),
      ),
      Flow.call(
        Wp.setGraphLinkData({
          wp1: Wp.getWpId(doorDef.wp1),
          wp2: Wp.getWpId(doorDef.wp2),
          open: true,
        }),
      ),
    );
  });

export const doorFactory = (scene: Phaser.Scene) => {
  return () => {
    const wp1 = Wp.wpPos(doorDef.wp1);
    const wp2 = Wp.wpPos(doorDef.wp2);
    const middlePos = wp1.clone().add(wp2).scale(0.5);
    const doorSep = new Vector2(0, 33);
    const points = [
      middlePos.clone().add(doorSep),
      middlePos.clone().subtract(doorSep),
    ];
    points.forEach((point, i) =>
      createSpriteAt(scene, point, "npc", "door-vertical")
        .setName(doorObjectKey(doorDef.key, i))
        .setDepth(Def.depths.npc),
    );
  };
};
