import { describe, it, expect } from "vitest";

import { createCache } from "../src/cache/create-cache";
import { has } from "../src/cache/has";
import { setOrUpdate } from "../src/cache/set";

describe("has", () => {
  const now = Date.now();

  it("should return false for non-existent key", () => {
    const state = createCache();

    expect(has(state, "nonexistent")).toBe(false);
  });

  it("should return true for valid entry", () => {
    const state = createCache();

    setOrUpdate(state, { key: "key1", value: "value1", ttlMs: 1000 });
    expect(has(state, "key1")).toBe(true);
  });

  it("should return true for stale entry", () => {
    const state = createCache();

    setOrUpdate(state, { key: "key1", value: "value1", ttlMs: 100, staleTTLMs: 200 }, now);
    expect(has(state, "key1", now + 150)).toBe(true);
  });

  it("should return false for expired entry", () => {
    const state = createCache();

    setOrUpdate(state, { key: "key1", value: "value1", ttlMs: 100 }, now);
    expect(has(state, "key1", now + 200)).toBe(false);
  });
});
