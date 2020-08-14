import { Maybe } from "purify-ts";
import { tail } from "lodash";

export type GraphProxy<V extends string> = {
  links(v: V): V[];
};

type BfsParams<V extends string> = {
  graph: GraphProxy<V>;
  startPoint: V;
};
type SearchResultPath<V extends string> = { prev?: V; dist: number };
type BfsResults<V extends string> = {
  paths: { [key: string]: SearchResultPath<V> };
};
export const bfs = <V extends string>(params: BfsParams<V>): BfsResults<V> => {
  const queue = [params.startPoint];
  const paths: { [key: string]: { prev?: V; dist: number } } = {
    [params.startPoint]: { dist: 0 },
  };
  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = params.graph.links(current);
    neighbors
      .filter((n) => !paths[n])
      .forEach((n) => {
        queue.push(n);
        paths[n] = { dist: paths[current].dist + 1, prev: current };
      });
  }
  return {
    paths,
  };
};

export const extractPath = <V extends string>(
  results: BfsResults<V>,
  target: V,
) => {
  const rec = (path: SearchResultPath<V>): V[] =>
    Maybe.fromNullable(path.prev)
      .map((prev) => [...rec(results.paths[prev]), prev])
      .orDefault([]);
  return tail(
    Maybe.fromNullable(results.paths[target])
      .map((path) => [...rec(path), target])
      .orDefault([]),
  );
};
