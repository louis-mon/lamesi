import * as _ from "lodash";
import { Scene } from "phaser";
import { makeDataHelper, DataHelper } from "/src/helpers/data";

const annotate = <T>() => (null as unknown) as T;

const defineGoKeys = (key: string) => <Data extends object>(data: Data) => ({
  key,
  data: _.mapValues(data, (value, dataKey) => (scene: Scene) =>
    makeDataHelper(scene.children.getByName(key)!, dataKey),
  ) as { [key in keyof Data]: (scene: Scene) => DataHelper<Data[key]> },
});

export type WpId = string & { __wpIdTag: null };

export const player = defineGoKeys("player")({
  currentPos: annotate<WpId>(),
});
