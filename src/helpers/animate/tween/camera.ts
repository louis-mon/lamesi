import * as Flow from "/src/helpers/phaser-flow";
import { fromEvent } from "rxjs";
import Vector2 = Phaser.Math.Vector2;
import PAN_COMPLETE = Phaser.Cameras.Scene2D.Events.PAN_COMPLETE;

export const panCameraTo = ({
  target,
  duration,
  zoom,
}: {
  target: Vector2;
  duration?: number;
  zoom?: number;
}): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const camera = scene.cameras.main;
    const h2 = camera.height / 2;
    const b0 = camera.scrollY + h2 * (1 + 1 / camera.zoom);
    const b1 = target.y + h2 / (zoom ?? camera.zoom);
    return Flow.parallel(
      Flow.wait(fromEvent(camera, PAN_COMPLETE)),
      Flow.call(() =>
        camera.pan(
          target.x,
          target.y,
          duration,
          undefined,
          undefined,
          (cam, t) => {
            cam.setZoom(h2 / (b0 + t * (b1 - b0) - (cam.scrollY + h2)));
          },
        ),
      ),
    );
  });
