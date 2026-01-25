import { describe, it, expect, beforeEach } from "vitest";

import { createCache, _resetInstanceCount } from "../src/cache/create-cache";
import { remainingStaleTTL } from "../src/cache/remaining-stale-ttl";
import { setOrUpdate } from "../src/cache/set";

describe("remainingStaleTTL", () => {
  beforeEach(() => {
    _resetInstanceCount();
  });

  const now = Date.now();

  it("returns 0 for non-existent key", () => {
    const state = createCache();
    expect(remainingStaleTTL(state, "missing", now)).toBe(0);
  });

  it("returns 0 when entry is not expired but has no stale TTL (covers se ?? 0)", () => {
    const state = createCache();
    const now = Date.now();

    // TTL futuro → no expirado
    setOrUpdate(state, { key: "k1", value: "v", ttl: 1000 }, now);

    // se = undefined, entry no expirado → se ?? 0 → Math.max(0, 0 - now) → 0
    expect(remainingStaleTTL(state, "k1", now + 10)).toBe(0);
  });

  it("returns remaining stale TTL when entry has stale TTL", () => {
    const state = createCache();

    setOrUpdate(state, { key: "k1", value: "v", ttl: 100, staleTtl: 200 }, now);

    // stale expires at now + 200 → at now + 150 → 50ms left
    expect(remainingStaleTTL(state, "k1", now + 150)).toBe(50);
  });

  it("returns 0 when stale TTL has passed", () => {
    const state = createCache();

    setOrUpdate(state, { key: "k1", value: "v", ttl: 100, staleTtl: 200 }, now);

    // stale expired at now + 200 → now + 350 is expired
    expect(remainingStaleTTL(state, "k1", now + 350)).toBe(0);
  });

  it("returns 0 when entry is expired (even if stale TTL exists)", () => {
    const state = createCache();

    setOrUpdate(state, { key: "k1", value: "v", ttl: 50, staleTtl: 200 }, now);

    const later = now + 220;

    expect(remainingStaleTTL(state, "k1", later)).toBe(0);
  });
});
