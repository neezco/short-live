import { describe, it, expect, beforeEach } from "vitest";

import { createCache, _resetInstanceCount } from "../src/cache/create-cache";
import { entries } from "../src/cache/entries";
import { setOrUpdate } from "../src/cache/set";

describe("entries", () => {
  beforeEach(() => {
    _resetInstanceCount();
  });
  it("should return an empty iterator for empty cache", () => {
    const state = createCache();

    const iterator = entries(state);
    expect(Array.from(iterator)).toEqual([]);
  });

  it("should return an iterator over the cache entries", () => {
    const state = createCache();

    setOrUpdate(state, { key: "key1", value: "value1", ttl: 1000 });
    setOrUpdate(state, { key: "key2", value: "value2", ttl: 1000 });

    const iterator = entries(state);
    const result = Array.from(iterator);

    expect(result).toHaveLength(2);
    expect(result.some(([key, entry]) => key === "key1" && entry.v === "value1")).toBe(true);
    expect(result.some(([key, entry]) => key === "key2" && entry.v === "value2")).toBe(true);
  });
});
