import { describe, it, expect } from "vitest";

import { LocalTtlCache } from "../src/index";

describe("maxSize limit", () => {
  it("should allow unlimited entries when maxSize is not set", () => {
    const cache = new LocalTtlCache();
    for (let i = 0; i < 100; i++) {
      cache.set(`key${i}`, `value${i}`);
    }
    expect(cache.size).toBe(100);
  });

  it("should enforce maxSize limit", () => {
    const cache = new LocalTtlCache({ maxSize: 3 });
    cache.set("key1", "value1");
    cache.set("key2", "value2");
    cache.set("key3", "value3");
    expect(cache.size).toBe(3);

    // Try to add beyond limit
    cache.set("key4", "value4");
    expect(cache.size).toBe(3);
    expect(cache.get("key4")).toBeUndefined();
  });

  it("should allow update of existing key at maxSize", () => {
    const cache = new LocalTtlCache({ maxSize: 2 });
    cache.set("key1", "value1");
    cache.set("key2", "value2");
    expect(cache.size).toBe(2);

    // Update should work
    cache.set("key1", "updated");
    expect(cache.size).toBe(2);
    expect(cache.get("key1")).toBe("updated");
  });

  it("should allow new entries after deletion", () => {
    const cache = new LocalTtlCache({ maxSize: 2 });
    cache.set("key1", "value1");
    cache.set("key2", "value2");

    cache.delete("key1");
    cache.set("key3", "value3");

    expect(cache.size).toBe(2);
    expect(cache.get("key3")).toBe("value3");
  });
});
