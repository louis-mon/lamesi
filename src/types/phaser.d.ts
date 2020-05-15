import * as P from "phaser";
import Pointer = P.Input.Pointer;

declare module "phaser" {
  namespace Phaser {
    type EventGameObjectMapping = {
      drag: (pointer: Pointer, dragX: number, dragY: number) => void;
      dragstart: (pointer: Pointer, dragX: number, dragY: number) => void;
      pointerdown: (
        pointer: Pointer,
        localX: number,
        localY: number,
        event: P.Types.Input.EventData,
      ) => void;
    };

    namespace GameObjects {
      export interface GameObject {
        on<E extends keyof EventGameObjectMapping, T extends GameObject>(
          this: T,
          e: E,
          f: EventGameObjectMapping[E],
        ): T;
      }
    }
  }
  // @ts-ignore
  export = Phaser;
}
