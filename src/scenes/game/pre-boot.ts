import BootCallback = Phaser.Types.Core.BootCallback;
import { eventsHelpers, globalData } from "/src/scenes/common/global-data";
import _ from "lodash";
import { DataMappingDefValues } from "/src/helpers/component";

const initialGlobalData: DataMappingDefValues<typeof globalData> = {
  lights1: true,
  lightsAvailable: false,
  lights2: false,
  lights3: false,
  lights4: false,
  lights5: false,

  cheatCodes: true,

  dungeonActivateHint: false,
  dungeonTakeHint: false,
  dungeonSkillHint: false,

  dungeonAvailable: false,
  dungeonPhase2: false,
  dungeonPhase3: false,
  dungeonPhase4: false,
  dungeonPhase5: false,

  creaturesAvailable: false,
};

export const gamePreBoot: BootCallback = (game) => {
  const storageKey = "save";
  const oldSave = localStorage.getItem(storageKey);
  const initialData = oldSave ? JSON.parse(oldSave) : initialGlobalData;
  _.mapValues(initialData, (value, key) => game.registry.set(key, value));
  game.events.on("changedata", (parent: unknown) => {
    if (parent !== game) return;
    localStorage.setItem(storageKey, JSON.stringify(game.registry.getAll()));
  });
};
