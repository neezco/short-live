import { describe, it, expect } from "vitest";

import { LocalTtlCache } from "../src/index";

describe("set", () => {
  it("should set and retrieve value", () => {
    const cache = new LocalTtlCache();
    const result = cache.set("key1", "value1");
    expect(result).toBe(true);
    expect(cache.get("key1")).toBe("value1");
  });

  it("should accept different types", () => {
    const cache = new LocalTtlCache();
    cache.set("str", "hello");
    cache.set("num", 42);
    cache.set("obj", { a: 1 });
    cache.set("nil", null);

    expect(cache.get("str")).toBe("hello");
    expect(cache.get("num")).toBe(42);
    expect(cache.get("obj")).toEqual({ a: 1 });
    expect(cache.get("nil")).toBe(null);
  });

  it("should throw on missing key", () => {
    const cache = new LocalTtlCache();
    expect(() => cache.set(null as unknown as string, "value")).toThrow();
  });

  it("should ignore undefined value", () => {
    const cache = new LocalTtlCache();
    cache.set("key1", "before");
    cache.set("key1", undefined);
    expect(cache.get("key1")).toBe("before");
  });

  it("should support basic cache operations", () => {
    const cache = new LocalTtlCache();
    cache.set("key1", "value1");
    cache.set("key2", "value2");

    expect(cache.size).toBe(2);
    expect(cache.get("key1")).toBe("value1");
    expect(cache.get("key2")).toBe("value2");
  });

  it("should track multiple entries", () => {
    const cache = new LocalTtlCache();

    for (let i = 0; i < 10; i++) {
      cache.set(`key${i}`, `value${i}`);
    }

    expect(cache.size).toBe(10);
    expect(cache.get("key0")).toBe("value0");
    expect(cache.get("key9")).toBe("value9");
  });
});
