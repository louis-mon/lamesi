import { Observable } from "rxjs";
import Phaser from "phaser";
import _ from "lodash";
import { map, first } from "rxjs/operators";
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

const sequence2 =
  <C>(a1: ActionNode<C>, a2: ActionNode<C>): ActionNode<C> =>
  (c) =>
  (p) =>
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

const makeAborter = (
  p: ActionRunParams,
): { childParams: ActionRunParams; abort: () => void } => {
  const emitter = new Phaser.Events.EventEmitter();
  const abortEvent = "abort";
  const abort = () => emitter.emit(abortEvent);
  p.registerAbort(abort);
  return {
    childParams: {
      registerAbort: (f) => emitter.on(abortEvent, f),
      unregisterAbort: (f) => emitter.off(abortEvent, f),
      onComplete: () => p.unregisterAbort(abort),
    },
    abort,
  };
};

/**
 * Completes whenever 'main' completes.
 * run 'back' in parallel and abort when 'main' completes
 */
export const withBackground =
  <C>(params: { main: ActionNode<C>; back: ActionNode<C> }): ActionNode<C> =>
  (c) =>
  (p) => {
    const aborter = makeAborter(p);
    params.back(c)(aborter.childParams);
    params.main(c)({
      ...p,
      onComplete: () => {
        aborter.abort();
        p.onComplete();
      },
    });
  };

/** Completes whenever any of the actions complete, aborting the others */
export const concurrent =
  <C>(...actions: ActionNode<C>[]): ActionNode<C> =>
  (c) =>
  (p) => {
    const aborter = makeAborter(p);
    let completed = false;
    actions.forEach((action) =>
      action(c)({
        ...aborter.childParams,
        onComplete: () => {
          if (!completed) {
            completed = true;
            aborter.abort();
            aborter.childParams.onComplete();
            p.onComplete();
          }
        },
      }),
    );
  };

/**
 * Encapsulate a simple function call
 */
export const call =
  <C>(f: (context: C) => void): ActionNode<C> =>
  (context) =>
  (p) => {
    f(context);
    p.onComplete();
  };

export const noop = call(() => {});

/**
 * Never completes
 */
export const infinite: ActionNode<unknown> = (c) => (p) => {};

type ObservableFactory<C, T> = FuncOrConst<C, Observable<T>>;
export const composeObservable =
  <C, T, U>(
    factory: ObservableFactory<C, T>,
    f: (t: Observable<T>) => Observable<U>,
  ): ObservableFactory<C, U> =>
  (c) =>
    f(funcOrConstValue(c, factory));

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
    const unsubscribe = () => subscription.unsubscribe();
    const completeAction = () => {
      p.unregisterAbort(unsubscribe);
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
    p.registerAbort(unsubscribe);
  };
}

/**
 * Run the action when the condition is true and completes after
 */
export const whenTrueDo =
  <C>(params: {
    condition: ObservableFactory<C, boolean>;
    action: ActionNode<C>;
  }): ActionNode<C> =>
  (c) =>
    observe(
      funcOrConstValue(c, params.condition).pipe(
        first((x) => x),
        map(() => params.action),
      ),
    )(c);

/**
 * Run the action when there is a value and completes after
 */
export const whenValueDo =
  <C, T>(params: {
    condition: ObservableFactory<C, T>;
    action: (t: T) => ActionNode<C>;
  }): ActionNode<C> =>
  (c) =>
    observe(
      funcOrConstValue(c, params.condition).pipe(first(), map(params.action)),
    )(c);

/**
 * Run the action when the condition is true and repeat, sequentially
 */
export const repeatWhen = <C>(params: {
  condition: ObservableFactory<C, boolean>;
  action: ActionNode<C>;
}): ActionNode<C> => repeat(whenTrueDo(params));

/**
 * Wait for an observable to produce a value
 */
export const wait = <C>(observable: ObservableFactory<C, unknown>) =>
  whenValueDo({
    condition: observable,
    action: () => noop,
  });

/**
 * Wait for an observable to produce a true value
 */
export const waitTrue = <C>(observable: ObservableFactory<C, boolean>) =>
  wait(composeObservable(observable, (obs) => obs.pipe(first(_.identity))));

/**
 * Execute sequentially the same flow again and again
 */
export const repeat =
  <C>(action: ActionNode<C>): ActionNode<C> =>
  (context) =>
  (p) => {
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

/**
 * Executes sequentially a sequence of flows
 */
export const repeatSequence = <C>(...flows: ActionNode<C>[]) =>
  repeat(sequence(...flows));

/**
 * Perform the given task whenever the condition is true,
 * but abort the task whenever the condition becomes false
 */
export const taskWithSentinel = <C>({
  condition,
  task,
}: {
  condition: ObservableFactory<C, boolean>;
  task: ActionNode<C>;
}) =>
  repeatWhen({
    condition,
    action: sequence(
      withBackground({
        main: whenTrueDo({
          condition: composeObservable(condition, (o) =>
            o.pipe(map((x) => !x)),
          ),
          action: noop,
        }),
        back: task,
      }),
    ),
  });

/** Run an action whenever an event is observed like {@link observe},
 * but terminates the previous action
 * when a new one is run
 */
export const observeSentinel = <C, T>(
  condition: ObservableFactory<C, T>,
  action: (t: T) => ActionNode<C>,
) =>
  observe(condition, (t) =>
    withBackground({
      main: wait(condition),
      back: action(t),
    }),
  );

/**
 * Generate a flow dynamically depending on the context
 */
export const lazy =
  <C>(action: (c: C) => ActionNode<C>): ActionNode<C> =>
  (c) =>
  (p) =>
    action(c)(c)(p);

export const withContext =
  <C, CNew>(
    newContext: (old: C) => CNew,
    action: ActionNode<CNew>,
  ): ActionNode<C> =>
  (c) =>
  (p) =>
    action(newContext(c))(p);

export const spawn = <C>(node: ActionNode<C>): ActionNode<C> =>
  call((c) => run(c, node));

/**
 * Start execution of a flow with a given context
 */
export const run = <C>(context: C, node: ActionNode<C>): void =>
  node(context)({
    onComplete: () => {},
    registerAbort: _.noop,
    unregisterAbort: _.noop,
  });
