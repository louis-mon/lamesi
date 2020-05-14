import { Maybe } from "purify-ts";
import { Observable } from "rxjs";

export type ActionRunParams = {
  onAbort: () => void;
  onComplete: () => void;
};
type ActionExecution = {
  abort?: () => void;
};
export type ActionNode<C> = (
  context: C,
) => (params: ActionRunParams) => ActionExecution;

const tryToAbortAction = (action: ActionExecution) =>
  Maybe.fromNullable(action.abort).map((f) => f());

export function sequence<C>(
  a1: ActionNode<C>,
  a2: ActionNode<C>,
): ActionNode<C>;

export function sequence<C>(...actions: ActionNode<C>[]): ActionNode<C>;

export function sequence<C>(...actions: ActionNode<C>[]): ActionNode<C> {
  return actions.reduce(sequence2);
}

const sequence2 = <C>(a1: ActionNode<C>, a2: ActionNode<C>): ActionNode<C> => (
  c,
) => (iParams) => {
  let aborted = false;
  let currentAction = a1(c)({
    ...iParams,
    onComplete: () => {
      if (aborted) return;
      currentAction = a2(c)({ ...iParams });
    },
  });
  return {
    abort: () => {
      aborted = true;
      return tryToAbortAction(currentAction);
    },
  };
};

export function parallel<C>(...actions: ActionNode<C>[]): ActionNode<C> {
  return (c) => (p) => {
    let nbDone = 0;
    actions.forEach((action, i) => {
      action(c)({
        ...p,
        onComplete: () => {
          ++nbDone;
          if (nbDone === actions.length) {
            p.onComplete();
          }
        },
      });
    });
    return {};
  };
}

/**
 * Ensapsulate a simple function call
 */
export const call = <C>(f: (context: C) => void): ActionNode<C> => (
  context,
) => (p) => {
  f(context);
  p.onComplete();
  return {};
};

/**
 * Execute a cleanup when the given action is aborted
 */
export const withCleanup = <C>(params: {
  action: ActionNode<C>;
  cleanup: (context: C) => void;
}): ActionNode<C> => (context) => (p) => {
  const action = params.action(context)(p);
  return {
    abort: () => {
      tryToAbortAction(action);
      params.cleanup(context);
    },
  };
};

/**
 * Run the action whenever some condition is true
 * Abort when the condition switches from true to false
 */
export const withSentinel = <C>(params: {
  sentinel: (context: C) => Observable<boolean>;
  action: ActionNode<C>;
}): ActionNode<C> => (context) => (p) => {
  let action: ActionExecution | null = null;
  const subscription = params.sentinel(context).subscribe((value) => {
    if (value && !action) {
      action = params.action(context)({
        ...p,
        onAbort: () => {
          subscription.unsubscribe();
          p.onAbort();
        },
        onComplete: () => {
          action = null;
        },
      });
    } else if (!value && action) {
      tryToAbortAction(action);
      action = null;
    }
  });
  return {
    abort: () => {
      subscription.unsubscribe();
      action && tryToAbortAction(action);
    },
  };
};

export const loop = <C>(action: ActionNode<C>): ActionNode<C> => (context) => (
  p,
) => {
  const rec = () =>
    action(context)({
      onAbort: p.onAbort,
      onComplete: () => {
        currentAction = rec();
      },
    });
  let currentAction = rec();
  return {
    abort: () => tryToAbortAction(currentAction),
  };
};

export const execute = <C>(context: C, node: ActionNode<C>) =>
  node(context)({
    onAbort: () => {},
    onComplete: () => {},
  });
