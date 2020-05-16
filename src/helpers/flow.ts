import { Maybe } from "purify-ts";
import { Observable, of, empty } from "rxjs";
import _ from "lodash";
import { startWith, pairwise, map, flatMap } from "rxjs/operators";

type ActionExecution = {
  abort?: () => void;
};
export type ActionRunParams = {
  onStart: (execution: ActionExecution) => void;
  onAbort: () => void;
  onComplete: () => void;
};
export type ActionNode<C> = (context: C) => (params: ActionRunParams) => void;

const tryToAbortAction = (action: ActionExecution | null) =>
  Maybe.fromNullable(action)
    .chainNullable((a) => a.abort)
    .map((f) => f());

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
) => (p) => {
  let aborted = false;
  const onStart = (e: ActionExecution) => {
    p.onStart({
      abort: () => {
        aborted = true;
        tryToAbortAction(e);
      },
    });
  };
  a1(c)({
    ...p,
    onStart,
    onComplete: () => {
      if (aborted) return;
      a2(c)({ ...p, onStart });
    },
  });
};

export function parallel<C>(...actions: ActionNode<C>[]): ActionNode<C> {
  return (c) => (p) => {
    let nbDone = 0;
    actions.forEach((action) => {
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
  };
}

/**
 * Ensapsulate a simple function call
 */
export const call = <C>(f: (context: C) => void): ActionNode<C> => (
  context,
) => (p) => {
  p.onStart({});
  f(context);
  p.onComplete();
};

export const noop = call(() => {});

/**
 * Execute a cleanup when the given action is aborted
 */
export const withCleanup = <C>(params: {
  action: ActionNode<C>;
  cleanup: (context: C) => void;
}): ActionNode<C> => (context) => (p) => {
  params.action(context)({
    ...p,
    onStart: (e) => {
      p.onStart({
        abort: () => {
          tryToAbortAction(e);
          params.cleanup(context);
        },
      });
    },
  });
};

/**
 * Run observed actions sequentially.
 * Abort current action when a new action is given
 */
export const fromObservable = <C>(
  observable: Observable<ActionNode<C>>,
): ActionNode<C> => (c) => (p) => {
  let exec: ActionExecution | null = null;
  let exhausted = false;
  const subscription = observable.subscribe({
    next: (action) => {
      tryToAbortAction(exec);
      action(c)({
        onStart: (e) => {
          exec = e;
          return p.onStart({
            abort: () => {
              subscription.unsubscribe();
              tryToAbortAction(e);
            },
          });
        },
        onAbort: () => {
          subscription.unsubscribe();
          p.onAbort();
        },
        onComplete: () => {
          exec = null;
          if (exhausted) p.onComplete();
        },
      });
    },
    complete: () => {
      exhausted = true;
      if (!exec) p.onComplete();
    },
  });
};

/**
 * Run the action whenever some condition is true
 * Abort when the condition switches from true to false
 */
export const withSentinel = <C>(params: {
  sentinel: Observable<boolean>;
  action: ActionNode<C>;
}): ActionNode<C> =>
  fromObservable(
    params.sentinel.pipe(
      startWith(false),
      pairwise(),
      flatMap(([previous, value]) => {
        if (value && !previous) return of(params.action);
        if (!value && previous) return of(noop);
        return empty();
      }),
    ),
  );

/**
 * Execute sequentially the same flow again and again
 */
export const loop = <C>(action: ActionNode<C>): ActionNode<C> => (context) => (
  p,
) => {
  let aborted = false;
  const rec = () =>
    action(context)({
      onStart: (e) =>
        p.onStart({
          abort: () => {
            aborted = true;
            tryToAbortAction(e);
          },
        }),
      onAbort: p.onAbort,
      onComplete: () => {
        if (aborted) return;
        rec();
      },
    });
  rec();
};

/**
 * Generate a flow dynamically depending on the context
 */
export const lazy = <C>(action: (c: C) => ActionNode<C>): ActionNode<C> => (
  c,
) => (p) => action(c)(c)(p);

/**
 * Start execution of a flow with a given context
 */
export const run = <C>(context: C, node: ActionNode<C>): void =>
  node(context)({
    onStart: () => {},
    onAbort: () => {},
    onComplete: () => {},
  });
