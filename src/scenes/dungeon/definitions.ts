import { defineGoKeys } from "/src/helpers/data";
import { annotate } from "/src/helpers/typing";

export type WpId = string & { __wpIdTag: null };

export const player = defineGoKeys("player")({
  currentPos: annotate<WpId>(),
});

const switchCrystalDef = (id: string) =>
  defineGoKeys(`switch-${id}`)({ state: annotate<boolean>() });

export type SwitchCrystalDef = ReturnType<typeof switchCrystalDef>;
export const switchRoom4DoorRight = switchCrystalDef("switchRoom4DoorRight");
