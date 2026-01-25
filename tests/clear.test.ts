import { describe, it, expect, vi, beforeEach } from "vitest";

import { clear } from "../src/cache/clear";
import { createCache, _resetInstanceCount } from "../src/cache/create-cache";
import { setOrUpdate } from "../src/cache/set";

describe("clear", () => {
  beforeEach(() => {
    _resetInstanceCount();
  });

  it("should clear empty cache without errors", () => {
    const state = createCache();
    expect(() => clear(state)).not.toThrow();
    expect(state.store.size).toBe(0);
  });

  it("should remove all entries from the cache", () => {
    const state = createCache();
    setOrUpdate(state, { key: "key1", value: "value1", ttl: 1000 });
    setOrUpdate(state, { key: "key2", value: "value2", ttl: 1000 });
    setOrUpdate(state, { key: "key3", value: "value3", ttl: 1000 });

    expect(state.store.size).toBe(3);
    clear(state);
    expect(state.store.size).toBe(0);
  });

  it("should NOT call onDelete callback when clearing", () => {
    const onDelete = vi.fn();
    const state = createCache({ onDelete });
    setOrUpdate(state, { key: "key1", value: "value1", ttl: 1000 });
    setOrUpdate(state, { key: "key2", value: "value2", ttl: 1000 });

    clear(state);

    expect(onDelete).not.toHaveBeenCalled();
    expect(state.store.size).toBe(0);
  });

  it("should work with null values without calling onDelete", () => {
    const onDelete = vi.fn();
    const state = createCache({ onDelete });
    setOrUpdate(state, { key: "key1", value: null, ttl: 1000 });

    clear(state);

    expect(onDelete).not.toHaveBeenCalled();
    expect(state.store.size).toBe(0);
  });
});
