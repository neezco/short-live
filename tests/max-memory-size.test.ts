import { describe, it, expect } from "vitest";

import { LocalTtlCache } from "../src/index";

describe("maxMemorySize limit", () => {
  it("should allow large values when maxMemorySize is not set", () => {
    const cache = new LocalTtlCache();
    const largeValue = "x".repeat(10000);

    for (let i = 0; i < 50; i++) {
      cache.set(`key${i}`, largeValue);
    }
    expect(cache.size).toBeGreaterThan(0);
  });

  it("should handle configuration with maxMemorySize", () => {
    const cache = new LocalTtlCache({ maxMemorySize: 100 });
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
  });

  it("should maintain maxSize independently of maxMemorySize", () => {
    const cache = new LocalTtlCache({ maxSize: 3, maxMemorySize: 1024 });
    cache.set("key1", "value1");
    cache.set("key2", "value2");
    cache.set("key3", "value3");

    expect(cache.size).toBe(3);
    cache.set("key4", "value4");
    expect(cache.size).toBe(3);
  });
});
