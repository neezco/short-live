import { describe, it, expect, beforeEach } from "vitest";

import { createCache, _resetInstanceCount } from "../src/cache/create-cache";
import { setOrUpdate } from "../src/cache/set";

describe("setOrUpdate", () => {
  beforeEach(() => {
    _resetInstanceCount();
  });

  const now = Date.now();

  it("should set a valid entry", () => {
    const state = createCache();
    setOrUpdate(state, { key: "key1", value: "value1", ttl: 1000 }, now);
    const entry = state.store.get("key1");
    expect(entry).toBeDefined();
    expect(entry!.v).toBe("value1");
    expect(entry!.e).toBe(now + 1000);
    expect(entry!.se).toBe(0);
  });

  it("should set entry with staleTtl", () => {
    const state = createCache();
    setOrUpdate(state, { key: "key1", value: "value1", ttl: 1000, staleTtl: 2000 }, now);

    const entry = state.store.get("key1");
    expect(entry!.se).toBe(now + 2000);
  });

  it("should throw error if key is missing", () => {
    const state = createCache();
    expect(() =>
      setOrUpdate(state, { key: null as unknown as string, value: "value1", ttl: 1000 }),
    ).toThrow("Missing key.");
  });

  it("should set entry with null value", () => {
    const state = createCache();
    setOrUpdate(state, { key: "key1", value: null }, now);

    const entry = state.store.get("key1");
    expect(entry!.v).toBe(null);
  });

  it("should ignore entry with undefined value", () => {
    const state = createCache();

    setOrUpdate(state, { key: "key1", value: "before" }, now);
    setOrUpdate(state, { key: "key1", value: undefined }, now);

    const entry = state.store.get("key1");
    expect(entry!.v).toBe("before");
  });

  it("should throw error if ttl is not finite", () => {
    const state = createCache();
    expect(() => setOrUpdate(state, { key: "key1", value: "value1", ttl: NaN })).toThrow(
      "TTL must be a finite number.",
    );
  });

  it("should throw error if staleTtl is not finite", () => {
    const state = createCache();
    expect(() =>
      setOrUpdate(state, { key: "key1", value: "value1", ttl: 1000, staleTtl: Infinity }),
    ).toThrow("staleTTL must be a finite number.");
  });

  it("should use defaultTtl if not provided in input", () => {
    const state = createCache({ defaultTtl: 2000 });
    setOrUpdate(state, { key: "key1", value: "value1" }, now);

    const entry = state.store.get("key1");
    expect(entry!.e).toBe(now + 2000);
  });

  it("should use defaultStaleTtl if staleTtl not provided", () => {
    const state = createCache({ defaultStaleTtl: 3000 });
    setOrUpdate(state, { key: "key1", value: "value1", ttl: 1000 }, now);

    const entry = state.store.get("key1");
    expect(entry!.se).toBe(now + 3000);
  });
});
