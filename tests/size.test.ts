import { describe, it, expect } from "vitest";

import { createCache } from "../src/cache/create-cache";
import { setOrUpdate } from "../src/cache/set";
import { size } from "../src/cache/size";

describe("size", () => {
  it("should return 0 for empty cache", () => {
    const state = createCache();

    expect(size(state)).toBe(0);
  });

  it("should return the number of entries in the cache", () => {
    const state = createCache();

    setOrUpdate(state, { key: "key1", value: "value1", ttlMs: 1000 });
    expect(size(state)).toBe(1);

    setOrUpdate(state, { key: "key2", value: "value2", ttlMs: 1000 });
    expect(size(state)).toBe(2);
  });
});
