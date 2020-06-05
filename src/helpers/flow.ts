import { Observable, of, empty } from "rxjs";
import _ from "lodash";
import { startWith, pairwise, map, flatMap, first } from "rxjs/operators";
import { FuncOrConst, funcOrConstValue } from "./functional";

export type ActionRunParams = {
  onComplete: () => void;
  registerAbort: (f: () => void) => void;
  unregisterAbort: (f: () => void) => void;
};
export type ActionNode<C> = (context: C) => (params: ActionRunParams) => void;

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
) => (p) =>
  a1(c)({
    ...p,
    onComplete: () => {
      a2(c)({ ...p });
    },
  });

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

export const withBackground = <C>(params: {
  main: ActionNode<C>;
  back: ActionNode<C>;
}): ActionNode<C> => (c) => (p) => {
  const emitter = new Phaser.Events.EventEmitter();
  const eventName = "abort";
  params.back(c)({
    onComplete: _.noop,
    registerAbort: (f) => emitter.on(eventName, f),
    unregisterAbort: (f) => emitter.off(eventName, f),
  });
  params.main(c)({
    ...p,
    onComplete: () => {
      emitter.emit(eventName);
      p.onComplete();
    },
  });
};

/**
 * Ensapsulate a simple function call
 */
export const call = <C>(f: (context: C) => void): ActionNode<C> => (
  context,
) => (p) => {
  f(context);
  p.onComplete();
};

export const noop = call(() => {});

type ObservableFactory<C, T> = FuncOrConst<C, Observable<T>>;
export const composeObservable = <C, T, U>(
  factory: ObservableFactory<C, T>,
  f: (t: Observable<T>) => Observable<U>,
): ObservableFactory<C, U> => (c) => f(funcOrConstValue(c, factory));

export function observe<C>(
  observable: ObservableFactory<C, ActionNode<C>>,
): ActionNode<C>;
export function observe<C, T>(
  observable: ObservableFactory<C, T>,
  action: (t: T) => ActionNode<C>,
): ActionNode<C>;

export function observe<C, T>(
  factory: ObservableFactory<C, T | ActionNode<C>>,
  actionMapper?: (t: T) => ActionNode<C>,
): ActionNode<C> {
  return (context) => (p) => {
    const source = funcOrConstValue(context, factory);
    const observable = actionMapper
      ? (source as Observable<T>).pipe(map(actionMapper))
      : (source as Observable<ActionNode<C>>);
    let nbRunning = 0;
    let completed = false;
    const unsubsribe = () => subscription.unsubscribe();
    const completeAction = () => {
      p.unregisterAbort(unsubsribe);
      p.onComplete();
    };
    const subscription = observable.subscribe({
      next: (action) => {
        ++nbRunning;
        action(context)({
          ...p,
          onComplete: () => {
            --nbRunning;
            if (completed) {
              completeAction();
            }
          },
        });
      },
      complete: () => {
        completed = true;
        if (nbRunning === 0) {
          completeAction();
        }
      },
    });
    p.registerAbort(unsubsribe);
  };
}

/**
 * Run the action when the condition is true and complete after
 */
export const when = <C>(params: {
  condition: ObservableFactory<C, boolean>;
  action: ActionNode<C>;
}): ActionNode<C> => (c) =>
  observe(
    funcOrConstValue(c, params.condition).pipe(
      first((x) => x),
      map(() => params.action),
    ),
  )(c);

/**
 * Run the action when the condition is true and repeat, sequentially
 */
export const repeatWhen = <C>(params: {
  condition: ObservableFactory<C, boolean>;
  action: ActionNode<C>;
}): ActionNode<C> => repeat(when(params));

export const wait = <C>(observable: ObservableFactory<C, unknown>) =>
  when({
    condition: composeObservable(observable, (o) => o.pipe(map(_.stubTrue))),
    action: noop,
  });

/**
 * Execute sequentially the same flow again and again
 */
export const repeat = <C>(action: ActionNode<C>): ActionNode<C> => (
  context,
) => (p) => {
  let aborted = false;
  const rec = () => {
    if (!aborted) {
      return action(context)({
        ...p,
        onComplete: rec,
      });
    }
  };
  p.registerAbort(() => {
    aborted = true;
  });
  rec();
};

export const taskWithSentinel = <C>({
  condition,
  task,
}: {
  condition: ObservableFactory<C, boolean>;
  task: ActionNode<C>;
}) =>
  repeatWhen({
    condition,
    action: withBackground({
      main: when({
        condition: composeObservable(condition, (o) => o.pipe(map((x) => !x))),
        action: noop,
      }),
      back: task,
    }),
  });

/**
 * Generate a flow dynamically depending on the context
 */
export const lazy = <C>(action: (c: C) => ActionNode<C>): ActionNode<C> => (
  c,
) => (p) => action(c)(c)(p);

export const withContext = <C, CNew>(
  newContext: (old: C) => CNew,
  action: ActionNode<CNew>,
): ActionNode<C> => (c) => (p) => action(newContext(c))(p);

/**
 * Start execution of a flow with a given context
 */
export const run = <C>(context: C, node: ActionNode<C>): void =>
  node(context)({
    onComplete: () => {},
    registerAbort: _.noop,
    unregisterAbort: _.noop,
  });
