import { defineGoKeys } from "/src/helpers/data";
import { annotate } from "/src/helpers/typing";

export type WpId = string & { __wpIdTag: null };

export const player = defineGoKeys("player")({
  currentPos: annotate<WpId>(),
});
