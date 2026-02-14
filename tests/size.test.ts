import { describe, it, expect } from "vitest";

import { LocalTtlCache } from "../src/index";

describe("size", () => {
  it("should return 0 for empty cache", () => {
    const cache = new LocalTtlCache();
    expect(cache.size).toBe(0);
  });

  it("should return number of entries", () => {
    const cache = new LocalTtlCache();
    cache.set("key1", "value1");
    expect(cache.size).toBe(1);

    cache.set("key2", "value2");
    expect(cache.size).toBe(2);
  });

  it("should decrease on delete", () => {
    const cache = new LocalTtlCache();
    cache.set("key1", "value1");
    cache.set("key2", "value2");
    expect(cache.size).toBe(2);

    cache.delete("key1");
    expect(cache.size).toBe(1);
  });
});
