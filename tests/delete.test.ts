import { describe, it, expect, vi } from "vitest";

import { DELETE_REASON } from "../src/cache/delete";
import { LocalTtlCache } from "../src/index";

describe("delete", () => {
  it("should return false for non-existent key", () => {
    const cache = new LocalTtlCache();
    expect(cache.delete("nonexistent")).toBe(false);
  });

  it("should return true and delete existing key", () => {
    const cache = new LocalTtlCache();
    cache.set("key1", "value1");
    expect(cache.delete("key1")).toBe(true);
    expect(cache.has("key1")).toBe(false);
  });

  it("should call onDelete callback when deleting", () => {
    const onDelete = vi.fn();
    const cache = new LocalTtlCache({ onDelete });
    cache.set("key1", "value1");

    cache.delete("key1");
    expect(onDelete).toHaveBeenCalledWith("key1", "value1", DELETE_REASON.MANUAL);
  });

  it("should not call onDelete if key does not exist", () => {
    const onDelete = vi.fn();
    const cache = new LocalTtlCache({ onDelete });

    cache.delete("nonexistent");
    expect(onDelete).not.toHaveBeenCalled();
  });
});
