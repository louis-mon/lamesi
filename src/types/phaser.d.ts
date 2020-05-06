import Pointer = Phaser.Input.Pointer;

type EventGameObjectMapping = {
  drag: (pointer: Pointer, dragX: number, dragY: number) => void;
  pointerdown: (
    pointer: Pointer,
    localX: number,
    localY: number,
    event: Phaser.Types.Input.EventData
  ) => void;
};

declare namespace Phaser {
  namespace GameObjects {
    interface GameObject {
      on<E extends keyof EventGameObjectMapping, T extends GameObject>(
        this: T,
        e: E,
        f: EventGameObjectMapping[E]
      ): T;
    }
  }
}

declare module "phaser" {
  export = Phaser;
}
