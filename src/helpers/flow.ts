import { Maybe } from "purify-ts";

export type ActionRunParams<Input, Output> = {
  input: Input;
  onAbort: () => void;
  onComplete: (o: Output) => void;
};
export type ActionNode<C, Input, Output> = (
  context: C,
) => (
  params: ActionRunParams<Input, Output>,
) => {
  abort?: () => void;
};

export function sequence<C, I1, I2, I3>(
  a1: ActionNode<C, I1, I2>,
  a2: ActionNode<C, I2, I3>,
): ActionNode<C, I1, I3>;

export function sequence<C>(
  ...actions: ActionNode<C, unknown, unknown>[]
): ActionNode<C, unknown, unknown>;

export function sequence<C>(
  ...actions: ActionNode<C, unknown, unknown>[]
): ActionNode<C, unknown, unknown> {
  if (actions.length === 2) sequence2(actions[0], actions[1]);
  return actions.reduce(sequence2);
}

const sequence2 = <C, I1, I2, I3>(
  a1: ActionNode<C, I1, I2>,
  a2: ActionNode<C, I2, I3>,
): ActionNode<C, I1, I3> => (c) => (iParams) => {
  let aborted = false;
  const combined = a1(c)({
    ...iParams,
    onComplete: (output) => {
      if (aborted) return;
      currentAction = a2(c)({ ...iParams, input: output });
    },
  });
  let currentAction = combined;
  return {
    abort: () => {
      aborted = true;
      return Maybe.fromNullable(currentAction.abort).map((f) => f());
    },
  };
};

export function parallel<C>(
  ...actions: ActionNode<C, unknown, unknown>[]
): ActionNode<C, unknown, unknown> {
  return (c) => (p) => {
    let nbDone = 0;
    actions.forEach((action, i) => {
      action(c)({
        ...p,
        onComplete: () => {
          ++nbDone;
          if (nbDone === actions.length) {
            p.onComplete(undefined);
          }
        },
      });
    });
    return {};
  };
}

export const call = <C, Input, Output>(
  f: (p: { context: C; input: Input }) => Output,
): ActionNode<C, Input, Output> => (context) => (p) => {
  p.onComplete(f({ context, ...p }));
  return {};
};

export const execute = <C>(context: C, node: ActionNode<C, unknown, unknown>) =>
  node(context)({
    input: undefined,
    onAbort: () => {},
    onComplete: () => {},
  });
