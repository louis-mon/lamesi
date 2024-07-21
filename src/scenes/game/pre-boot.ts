import BootCallback = Phaser.Types.Core.BootCallback;
import { globalData, otherGlobalData } from "/src/scenes/common/global-data";
import { DataMappingDefValues } from "/src/helpers/component";
import { Game } from "phaser";

type AllGlobalData = DataMappingDefValues<typeof globalData> &
  DataMappingDefValues<typeof otherGlobalData>;

const initialGlobalData: AllGlobalData = {
  /** modified */
  cheatCodes: true,
  globalAudioLevel: 1,

  firstEvent: true,

  /** end of modified */

  dungeonActivateHint: false,
  dungeonSkillHint: false,
  dungeonTakeHint: false,

  lights1: false,
  lights2: false,
  lights3: false,
  lights4: false,
  lights5: false,
  lightsDone: false,

  dungeonPhase1: false,
  dungeonPhase2: false,
  dungeonPhase3: false,
  dungeonPhase4: false,
  dungeonPhase5: false,
  dungeonDone: false,

  creatures1: false,
  creatures2: false,
  creatures3: false,
  creatures4: false,
  creatures4Done: false,

  finalPhase: false,
  gameFinished: false,
};

export const resetGameData = (game: Game) => {
  game.registry.merge(initialGlobalData);
};

export const gamePreBoot: BootCallback = (game) => {
  const storageKey = "save";
  const oldSave = localStorage.getItem(storageKey);
  const initialDataFromSave = oldSave ? JSON.parse(oldSave) : {};
  const fromEnv = JSON.parse(process.env.LAMESI_EVENTS ?? "{}");
  const initialData: AllGlobalData = {
    ...initialGlobalData,
    ...initialDataFromSave,
    ...fromEnv,
  };
  game.registry.merge(initialData);
  game.events.on("changedata", (parent: unknown) => {
    if (parent !== game) return;
    localStorage.setItem(storageKey, JSON.stringify(game.registry.getAll()));
  });
};
