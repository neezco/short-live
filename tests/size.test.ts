import { describe, it, expect, beforeEach } from "vitest";

import { createCache, _resetInstanceCount } from "../src/cache/create-cache";
import { setOrUpdate } from "../src/cache/set";
import { size } from "../src/cache/size";

describe("size", () => {
  beforeEach(() => {
    _resetInstanceCount();
  });
  it("should return 0 for empty cache", () => {
    const state = createCache();

    expect(size(state)).toBe(0);
  });

  it("should return the number of entries in the cache", () => {
    const state = createCache();

    setOrUpdate(state, { key: "key1", value: "value1", ttl: 1000 });
    expect(size(state)).toBe(1);

    setOrUpdate(state, { key: "key2", value: "value2", ttl: 1000 });
    expect(size(state)).toBe(2);
  });
});
