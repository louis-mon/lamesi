import Vector2 = Phaser.Math.Vector2;

import {
  getObjectPosition,
  ManipulableObject,
  placeAt,
  SceneContext,
} from "../phaser";
import * as Flow from "/src/helpers/phaser-flow";

export const followObject = ({
  source,
  target,
  offset,
}: {
  source: SceneContext<ManipulableObject>;
  target: SceneContext<ManipulableObject>;
  offset: Vector2;
}): Flow.PhaserNode => (scene) => (params) => {
  const handler = () => {
    placeAt(target(scene), getObjectPosition(source(scene)).add(offset));
  };
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, handler);
  params.registerAbort(() =>
    scene.events.removeListener(Phaser.Scenes.Events.POST_UPDATE, handler),
  );
};
