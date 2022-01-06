import { customEvent, defineEvents } from "/src/helpers/component";
import { GlobalDataKey } from "/src/scenes/common/global-data";

export type EndEventAnim = {
  dataSolved: GlobalDataKey;
};

export const globalEvents = defineEvents(
  {
    subSceneEntered: customEvent(),
    endEventAnim: customEvent<EndEventAnim>(),
    goToHub: customEvent(),
    subSceneHint: customEvent<{ sceneKey: string }>(),
  },
  "game",
);
