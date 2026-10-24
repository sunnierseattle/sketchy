/**
 * Reuses a previously built value when every input is identical (===).
 *
 * React Flow and `memo(EntityNode)` skip work only when a node object keeps its
 * identity. Rebuilding every node whenever any node moves made dragging cost
 * O(nodes) renders per frame, so builders look results up here by node id.
 */
export interface KeyedCache<T> {
  get(id: string, inputs: readonly unknown[], build: () => T): T;
  /** Drop entries for ids that no longer exist. */
  retain(ids: ReadonlySet<string>): void;
}

export function createKeyedCache<T>(): KeyedCache<T> {
  const entries = new Map<string, { inputs: readonly unknown[]; value: T }>();

  return {
    get(id, inputs, build) {
      const cached = entries.get(id);
      if (
        cached
        && cached.inputs.length === inputs.length
        && cached.inputs.every((input, i) => input === inputs[i])
      ) {
        return cached.value;
      }
      const value = build();
      entries.set(id, { inputs, value });
      return value;
    },
    retain(ids) {
      for (const id of entries.keys()) {
        if (!ids.has(id)) entries.delete(id);
      }
    },
  };
}
