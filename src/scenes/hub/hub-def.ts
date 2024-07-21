import { defineSceneClass } from "/src/helpers/component";
import { annotate } from "/src/helpers/typing";

export const hubSceneClass = defineSceneClass({
  events: {},
  data: {
    masterReady: annotate<boolean>(),
  },
});
