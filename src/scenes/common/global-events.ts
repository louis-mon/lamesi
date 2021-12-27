import { customEvent, defineEvents } from "/src/helpers/component";
import { GlobalDataKey } from "/src/scenes/common/global-data";
import { Scene } from "phaser";

export type EndEventAnim = {
  dataSolved: GlobalDataKey
  fromScene: Scene
}

export const globalEvents = defineEvents(
  {
    endEventAnim: customEvent<EndEventAnim>(),
    goToHub: customEvent(),
  },
  "game",
);
