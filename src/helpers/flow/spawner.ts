import { Subject } from "rxjs";
import * as Flow from "/src/helpers/flow";

export const makeSpawner = <C>() => {
  const subject = new Subject<Flow.ActionNode<C>>();
  return {
    flow: Flow.observe(subject),
    subject,
    spawn: (node: Flow.ActionNode<C>) => subject.next(node),
  };
};
