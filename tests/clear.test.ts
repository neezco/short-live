import { describe, it, expect, vi } from "vitest";

import { LocalTtlCache } from "../src/index";

describe("clear", () => {
  it("should remove all entries", () => {
    const cache = new LocalTtlCache();
    cache.set("key1", "value1");
    cache.set("key2", "value2");
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
  });

  it("should not call onDelete when clearing", () => {
    const onDelete = vi.fn();
    const cache = new LocalTtlCache({ onDelete });
    cache.set("key1", "value1");

    cache.clear();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
