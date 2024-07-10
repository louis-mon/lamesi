import * as Flow from "/src/helpers/phaser-flow";
import { BehaviorSubject, fromEvent, Subject } from "rxjs";
import Vector2 = Phaser.Math.Vector2;
import PAN_COMPLETE = Phaser.Cameras.Scene2D.Events.PAN_COMPLETE;
import { map } from "rxjs/operators";
import { uniqueId } from "lodash";

type PanCameraParams = {
  target: Vector2;
  duration?: number;
  zoom?: number;
};

const makeEventQueue = (key: string) => {
  return {
    run: (flow: Flow.PhaserNode): Flow.PhaserNode =>
      Flow.lazy((scene) => {
        const evQueue$: BehaviorSubject<string[]> =
          scene.data.get(key) ?? new BehaviorSubject<string[]>([]);
        scene.data.set(key, evQueue$);
        const id = uniqueId();
        evQueue$.next(evQueue$.value.concat(id));
        return Flow.withCleanup({
          flow: Flow.sequence(
            Flow.waitTrue(evQueue$.pipe(map((queue) => queue[0] === id))),
            flow,
          ),
          cleanup: () => evQueue$.next(evQueue$.value.filter((v) => v !== id)),
        });
      }),
  };
};

const cameraQueue = makeEventQueue("camera-panning");

export const panCameraToAndReset = ({
  action,
  ...params
}: PanCameraParams & { action: Flow.PhaserNode }): Flow.PhaserNode =>
  cameraQueue.run(
    Flow.lazy((scene) => {
      const { centerX, centerY, zoom } = scene.cameras.main;
      return Flow.sequence(
        panCameraTo(params),
        action,
        panCameraTo({
          duration: params.duration,
          zoom,
          target: new Vector2(centerX, centerY),
        }),
      );
    }),
  );

export const panCameraTo = ({
  target,
  duration,
  zoom,
}: PanCameraParams): Flow.PhaserNode =>
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
