import { customEvent, defineSceneClass } from "/src/helpers/component";

export const potSceneClass = defineSceneClass({
  events: {
    pickAllMandibles: customEvent(),
    syncMandibleClaw: customEvent(),
  },
  data: {},
});
