import Phaser from "phaser";
import Vector2 = Phaser.Math.Vector2;

import * as Def from "./definitions";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import _ from "lodash";

export const roomClouds: Flow.PhaserNode = Flow.lazy((scene) => {
  let cloudsByWp: Record<string, Phaser.GameObjects.Image> = _.mapValues(
    Wp.allWpById,
    (wp, id) => {
      const pos = Wp.wpPos(wp);
      return scene.add
        .image(pos.x, pos.y - 20, "npc", "clouds")
        .setDepth(Def.depths.clouds)
        .setScale(2.5, 3.4);
    },
  );
  return Flow.observe(
    Def.scene.events.removeCloudsOnActiveWps.subject,
    ({ activeWpIds }) => {
      const roomsToRemove = _.uniq(
        activeWpIds.map((wpId) => Wp.getWpDef(wpId).room),
      );
      const wpsToRemove = Wp.allWp.filter((wp) =>
        _.includes(roomsToRemove, wp.room),
      );
      const cloudsToRemove = _.compact(
        wpsToRemove.map((wp) => cloudsByWp[Wp.getWpId(wp)]),
      );
      cloudsByWp = _.omit(cloudsByWp, activeWpIds);
      return Flow.parallel(
        ...cloudsToRemove.map((cloud) =>
          Flow.sequence(
            Flow.tween({ targets: cloud, props: { alpha: 0 } }),
            Flow.call(() => cloud.destroy()),
          ),
        ),
      );
    },
  );
});
