import { identity } from "lodash";
import { BehaviorSubject, Subject } from "rxjs";
import * as Flow from "./flow";

type TestContext = {
  values: number[];
};

type TestFlow = Flow.ActionNode<TestContext>;

const expectFlow = (
  makeFlow: (params: {
    wait: (n: number) => TestFlow;
    push: (n: number) => TestFlow;
  }) => TestFlow,
) => {
  const context: TestContext = { values: [] };
  let counter = 0;
  let done = false;
  const handlers: { [n: number]: Array<() => void> } = {};
  const toEqualValues = (values: number[]) => {
    Flow.run(
      context,
      Flow.sequence(
        makeFlow({
          wait: (n) => () => (p) => {
            const step = counter + n;
            let aborted = false;
            p.registerAbort(() => (aborted = true));
            handlers[step] = [
              ...(handlers[step] || []),
              () => {
                if (!aborted) p.onComplete();
              },
            ];
          },
          push: (n) => Flow.call(({ values }) => values.push(n)),
        }),
        Flow.call(() => (done = true)),
      ),
    );
    while (!done && counter < 1000) {
      (handlers[counter] || []).forEach((h) => h());
      ++counter;
    }
    expect(context.values).toEqual(values);
  };
  return {
    toEqualValues,
  };
};

describe("# flow", () => {
  describe("# sequence", () => {
    test("executes actions in order", () => {
      expectFlow(() =>
        Flow.sequence(
          Flow.call(({ values }) => values.push(1)),
          Flow.call(({ values }) => values.push(2)),
        ),
      ).toEqualValues([1, 2]);
    });
    test("executes actions in order, wating", () => {
      expectFlow(({ wait }) =>
        Flow.sequence(
          wait(10),
          Flow.call(({ values }) => values.push(1)),
          wait(10),
          Flow.call(({ values }) => values.push(2)),
        ),
      ).toEqualValues([1, 2]);
    });
  });

  describe("# parallel", () => {
    test("executes actions in parallel", () => {
      expectFlow(({ wait, push }) =>
        Flow.parallel(
          Flow.sequence(push(1), wait(50), push(2)),
          Flow.sequence(wait(1), push(3), wait(10), push(4)),
        ),
      ).toEqualValues([1, 3, 4, 2]);
    });
  });

  describe("# concurrent", () => {
    test("stops after first action finishes", () =>
      expectFlow(({ wait, push }) =>
        Flow.concurrent(
          Flow.sequence(wait(5), push(1), wait(50), push(2)),
          Flow.sequence(wait(10), push(3)),
        ),
      ).toEqualValues([1, 3]));

    test("stops after first action finishes, nested", () =>
      expectFlow(({ wait, push }) =>
        Flow.parallel(
          Flow.concurrent(
            Flow.sequence(wait(5), push(1), wait(50), push(2)),
            Flow.sequence(wait(10), push(3)),
          ),
          Flow.sequence(wait(100), push(4)),
        ),
      ).toEqualValues([1, 3, 4]));
  });

  describe("# observeSentinel", () => {
    it("switches flows", () => {
      const o = new Subject<TestFlow>();
      expectFlow(({ push, wait }) =>
        Flow.parallel(
          Flow.observeSentinel(o, identity),
          Flow.call(() =>
            o.next(
              Flow.parallel(
                Flow.sequence(wait(100), push(1)),
                Flow.sequence(
                  wait(10),
                  Flow.call(() => o.next(Flow.sequence(wait(200), push(2)))),
                ),
              ),
            ),
          ),
        ),
      ).toEqualValues([2]);
    });
  });
});
