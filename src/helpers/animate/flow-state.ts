import { Subject } from "rxjs";
import * as Flow from "../flow";

export const makeStatesFlow = <C>() => {
  const currentState = new Subject<Flow.ActionNode<C>>();
  const next = (flow: Flow.ActionNode<C>): void => currentState.next(flow);
  const nextFlow = (flow: Flow.ActionNode<C>): Flow.ActionNode<C> =>
    Flow.call(() => currentState.next(flow));
  return {
    next,
    nextFlow,
    start: (flow: Flow.ActionNode<C>): Flow.ActionNode<C> =>
      Flow.parallel(
        Flow.observeSentinel(currentState, (x) => x),
        nextFlow(flow),
      ),
  };
};
