import * as Phaser from "phaser";
import * as Wp from "./wp";
import * as Flow from "/src/helpers/phaser-flow";
import { cutscene } from "/src/scenes/common/cutscene";
import { panCameraToAndReset } from "/src/helpers/animate/tween/camera";
import { Subject } from "rxjs";
import * as Def from "/src/scenes/dungeon/definitions";
import { map } from "rxjs/operators";

export const dungeonCutscene = (params: {
  targetWp: Wp.WpDef;
  inCutscene: Flow.PhaserNode;
  action?: Flow.PhaserNode;
}): Flow.PhaserNode => {
  const startAnim = new Subject();
  return Flow.parallel(
    cutscene(
      Flow.sequence(
        Flow.waitTimer(1000),
        panCameraToAndReset({
          target: Wp.wpPos(params.targetWp),
          duration: 1000,
          zoom: 2.5,
          action: Flow.sequence(
            Flow.waitTimer(1000),
            Flow.call(() => startAnim.next()),
            params.inCutscene,
            Flow.waitTimer(2000),
          ),
        }),
      ),
    ),
    Flow.sequence(Flow.wait(startAnim), params.action ?? Flow.noop),
  );
};

export const altarAppearCutscene = (params: {
  wp: Wp.WpDef;
  altarAppear: (p: { wp: Wp.WpDef }) => Flow.PhaserNode;
  beforeAltar?: Flow.PhaserNode;
}): Flow.PhaserNode => {
  const wpId = Wp.getWpId(params.wp);
  return dungeonCutscene({
    targetWp: params.wp,
    inCutscene: Flow.waitTrue((scene) =>
      Def.scene.events.altarAppeared
        .subject(scene)
        .pipe(map((p) => p.at === wpId)),
    ),
    action: Flow.sequence(
      params.beforeAltar ?? Flow.noop,
      Flow.call((scene) => scene.sound.play("item-appear")),
      Flow.spawn(params.altarAppear({ wp: params.wp })),
    ),
  });
};
