import { describe, it, expect, vi, beforeEach } from "vitest";

import { createCache, _resetInstanceCount } from "../src/cache/create-cache";
import { deleteKey, DELETE_REASON } from "../src/cache/delete";
import { setOrUpdate } from "../src/cache/set";

describe("deleteKey", () => {
  beforeEach(() => {
    _resetInstanceCount();
  });
  it("should return false for non-existent key", () => {
    const state = createCache();
    expect(deleteKey(state, "nonexistent")).toBe(false);
  });

  it("should return true and delete existing key", () => {
    const state = createCache();
    setOrUpdate(state, { key: "key1", value: "value1", ttl: 1000 });
    expect(deleteKey(state, "key1")).toBe(true);
    expect(state.store.has("key1")).toBe(false);
  });

  it("should call onDelete callback when deleting existing key", () => {
    const onDelete = vi.fn();
    const state = createCache({ onDelete });
    setOrUpdate(state, { key: "key1", value: "value1", ttl: 1000 });
    deleteKey(state, "key1");
    expect(onDelete).toHaveBeenCalledWith("key1", "value1", DELETE_REASON.MANUAL);
  });

  it("should not call onDelete if key does not exist", () => {
    const onDelete = vi.fn();
    const state = createCache({ onDelete });
    deleteKey(state, "nonexistent");
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("should delete with EXPIRED reason", () => {
    const onDelete = vi.fn();
    const state = createCache({ onDelete });
    setOrUpdate(state, { key: "key1", value: "value1", ttl: 1000 });
    deleteKey(state, "key1", DELETE_REASON.EXPIRED);
    expect(onDelete).toHaveBeenCalledWith("key1", "value1", DELETE_REASON.EXPIRED);
  });
});
