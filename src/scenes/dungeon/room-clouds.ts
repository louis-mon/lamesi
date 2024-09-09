import Phaser from "phaser";
import Vector2 = Phaser.Math.Vector2;

import * as Def from "./definitions";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import _ from "lodash";

export const roomClouds: Flow.PhaserNode = Flow.lazy((scene) => {
  const cloudsByRoom: Record<string, Phaser.GameObjects.Rectangle> =
    _.fromPairs(
      _.range(Wp.nbRooms).map((roomId) => {
        const { x, y } = Wp.wpPos({ room: roomId, x: 2, y: 2 });
        return [
          roomId,
          scene.add
            .rectangle(
              x,
              y - Wp.roomMargin.y,
              Wp.roomSize.x + Wp.roomMargin.x + 2,
              Wp.roomSize.y + Wp.roomMargin.y * 2 + 2,
              Def.dungeonBackground,
            )
            .setDepth(Def.depths.clouds),
        ];
      }),
    );
  return Flow.observe(
    Def.scene.events.removeCloudsOnActiveWps.subject,
    ({ activeWpIds }) => {
      const roomsToRemove = _.uniq(
        activeWpIds.map((wpId) => Wp.getWpDef(wpId).room),
      );
      return Flow.parallel(
        ...roomsToRemove
          .filter((roomId) => roomId in cloudsByRoom)
          .map((roomId) => {
            const cloud = cloudsByRoom[roomId];
            delete cloudsByRoom[roomId];
            return Flow.sequence(
              Flow.tween({
                targets: cloud,
                props: { alpha: 0 },
              }),
              Flow.call(() => cloud.destroy()),
            );
          }),
      );
    },
  );
});
