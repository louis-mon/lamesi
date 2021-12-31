import BootCallback = Phaser.Types.Core.BootCallback;
import { globalData, otherGlobalData } from "/src/scenes/common/global-data";
import _, { mapValues } from "lodash";
import { DataMappingDefValues } from "/src/helpers/component";

const defaultGlobalData: Partial<DataMappingDefValues<typeof globalData>> = {
  lights1: true,
};

const defaultOtherGlobalData: Partial<DataMappingDefValues<
  typeof otherGlobalData
>> = {
  cheatCodes: true,
};

const initialGlobalData = {
  ...mapValues(
    {
      ...globalData,
      ...otherGlobalData,
    },
    () => false,
  ),
  ...defaultGlobalData,
  ...defaultOtherGlobalData,
};

export const gamePreBoot: BootCallback = (game) => {
  const storageKey = "save";
  const oldSave = localStorage.getItem(storageKey);
  const initialDataFromSave = oldSave ? JSON.parse(oldSave) : initialGlobalData;
  const fromEnv = JSON.parse(process.env.LAMESI_EVENTS ?? "{}");
  const initialData = {
    ...initialDataFromSave,
    ...fromEnv,
  };
  _.mapValues(initialData, (value, key) => game.registry.set(key, value));
  game.events.on("changedata", (parent: unknown) => {
    if (parent !== game) return;
    localStorage.setItem(storageKey, JSON.stringify(game.registry.getAll()));
  });
};
