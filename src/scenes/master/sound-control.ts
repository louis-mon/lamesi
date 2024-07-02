import * as Flow from "/src/helpers/phaser-flow";
import { otherGlobalData } from "/src/scenes/common/global-data";

export const soundControl: Flow.PhaserNode = Flow.observe(
  otherGlobalData.globalAudioLevel.dataSubject,
  (v) => Flow.call((s) => (s.game.sound.volume = v)),
);
