import { describe, it, expect, beforeEach } from "vitest";

import { createCache, _resetInstanceCount } from "../src/cache/create-cache";
import { remainingTTL } from "../src/cache/remaining-ttl";
import { setOrUpdate } from "../src/cache/set";

describe("remainingTTL", () => {
  beforeEach(() => {
    _resetInstanceCount();
  });

  const now = Date.now();

  it("should return 0 for non-existent key", () => {
    const state = createCache();

    expect(remainingTTL(state, "nonexistent")).toBe(0);
  });

  it("should return remaining TTL for valid entry", () => {
    const state = createCache();

    setOrUpdate(state, { key: "key1", value: "value1", ttl: 1000 }, now);
    expect(remainingTTL(state, "key1", now + 100)).toBe(900);
  });

  it("should return 0 for expired entry", () => {
    const state = createCache();

    setOrUpdate(state, { key: "key1", value: "value1", ttl: 100 }, now);
    expect(remainingTTL(state, "key1", now + 200)).toBe(0);
  });

  it("should return remaining TTL for stale entry", () => {
    const state = createCache();

    setOrUpdate(state, { key: "key1", value: "value1", ttl: 100, staleTtl: 200 }, now);
    expect(remainingTTL(state, "key1", now + 150)).toBe(0); // TTL expired, but stale
  });
});
