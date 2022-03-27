import { GlobalDataKey } from "/src/scenes/common/global-data";
import { doorCenterPos, DoorKey } from "/src/scenes/dungeon/npc";
import * as Def from "./definitions";
import * as Npc from "./npc";
import * as Flow from "/src/helpers/phaser-flow";
import { createKeyItem } from "/src/scenes/common/key-item";
import { findPreviousEvent } from "/src/scenes/common/events-def";

export const openDoorWithKeyItem = ({
  eventKey,
  doorKey,
}: {
  eventKey: GlobalDataKey;
  doorKey: DoorKey;
}): Flow.PhaserNode =>
  Flow.lazy((scene) => {
    const keyItem = createKeyItem(findPreviousEvent(eventKey), scene);
    keyItem.obj.setDepth(Def.depths.keyItems);
    return Flow.sequence(
      keyItem.downAnim(doorCenterPos(doorKey)),
      keyItem.disappearAnim(),
      Npc.openDoor(doorKey),
    );
  });
