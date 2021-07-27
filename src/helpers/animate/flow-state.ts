import { Subject } from "rxjs";
import * as Flow from "../flow";

export type StatesFlow<C> = {
  next: (flow: Flow.ActionNode<C>) => void;
  nextFlow: (flow: Flow.ActionNode<C>) => Flow.ActionNode<C>;
  start: (flow?: Flow.ActionNode<C>) => Flow.ActionNode<C>;
};

export const makeStatesFlow = <C>(): StatesFlow<C> => {
  const currentState = new Subject<Flow.ActionNode<C>>();
  const next = (flow: Flow.ActionNode<C>): void => currentState.next(flow);
  const nextFlow = (flow: Flow.ActionNode<C>): Flow.ActionNode<C> =>
    Flow.call(() => currentState.next(flow));
  return {
    next,
    nextFlow,
    start: (flow: Flow.ActionNode<C> = Flow.noop): Flow.ActionNode<C> =>
      Flow.parallel(
        Flow.observeSentinel(currentState, (x) => x),
        nextFlow(flow),
      ),
  };
};
