import { describe, it, expect, vi } from "vitest";

import { LocalTtlCache, ENTRY_STATUS } from "../src/index";

describe("invalidateTag", () => {
  const cache = new LocalTtlCache();

  describe("basic tag invalidation", () => {
    it("should mark entry as EXPIRED when tag is invalidated (default behavior)", () => {
      cache.set("key", "value", { ttl: 10000, tags: "user:123" });

      let result = cache.get("key", { includeMetadata: true });
      expect(result?.status).toBe(ENTRY_STATUS.FRESH);

      cache.invalidateTag("user:123");

      result = cache.get("key", { includeMetadata: true });
      expect(result).toBeUndefined();
      expect(cache.has("key")).toBe(false);
    });

    it("should mark entry as STALE when tag is invalidated with asStale=true", () => {
      cache.set("key", "value", { ttl: 10000, staleWindow: 5000, tags: "user:123" });

      let result = cache.get("key", { includeMetadata: true });
      expect(result?.status).toBe(ENTRY_STATUS.FRESH);

      cache.invalidateTag("user:123", { asStale: true });

      result = cache.get("key", { includeMetadata: true });
      expect(result).toBeDefined();
      expect(result?.status).toBe(ENTRY_STATUS.STALE);
      expect(result?.data).toBe("value");
    });

    it("should handle entries without tags correctly", () => {
      cache.set("key", "value", { ttl: 5000 });

      const result = cache.get("key", { includeMetadata: true });
      expect(result).toBeDefined();
      expect(result?.tags).toBeNull();
      expect(result?.status).toBe(ENTRY_STATUS.FRESH);
    });
  });

  describe("multiple tags handling", () => {
    it("should handle multiple tags on entry - invalidating any tag invalidates entry", () => {
      cache.set("key", "value", { ttl: 10000, tags: ["user:123", "post:456"] });

      let result = cache.get("key", { includeMetadata: true });
      expect(result?.status).toBe(ENTRY_STATUS.FRESH);
      expect(result?.tags).toEqual(["user:123", "post:456"]);

      cache.invalidateTag("post:456");

      result = cache.get("key", { includeMetadata: true });
      expect(result).toBeUndefined();
    });

    it("should support batch tag invalidation", () => {
      cache.set("key1", "value1", { ttl: 10000, tags: "user:123" });
      cache.set("key2", "value2", { ttl: 10000, tags: "post:456" });
      cache.set("key3", "value3", { ttl: 10000, tags: "comment:789" });

      cache.invalidateTag(["user:123", "post:456"]);

      expect(cache.has("key1")).toBe(false);
      expect(cache.has("key2")).toBe(false);
      expect(cache.has("key3")).toBe(true);
    });

    it("should preserve entry status if tag invalidated but not applied (tag created after entry)", () => {
      cache.set("key", "value", { ttl: 10000, tags: "user:123" });

      const result1 = cache.get("key", { includeMetadata: true });
      expect(result1?.status).toBe(ENTRY_STATUS.FRESH);

      cache.invalidateTag("user:123");

      const result2 = cache.get("key", { includeMetadata: true });
      expect(result2).toBeUndefined();
    });
  });

  describe("tag invalidation with stale window", () => {
    it("should respect stale window when tag marks entry as stale", () => {
      vi.useFakeTimers();

      const ttl = 100;
      const staleWindow = 500;
      const now = Date.now();

      cache.set("key", "value", { ttl, staleWindow, tags: "item:123" });

      vi.setSystemTime(now + 50);
      cache.invalidateTag("item:123", { asStale: true });

      let result = cache.get("key", { includeMetadata: true });
      expect(result?.status).toBe(ENTRY_STATUS.STALE);

      vi.setSystemTime(now + ttl + staleWindow + 10);
      result = cache.get("key", { includeMetadata: true });
      expect(result).toBeUndefined();

      vi.useRealTimers();
    });

    it("should mark tagged entries as deleted when accessed", () => {
      const onDelete = vi.fn();
      const cache2 = new LocalTtlCache({ onDelete });
      cache2.set("key1", "value1", { tags: "tag1" });

      cache2.invalidateTag("tag1");
      cache2.get("key1");

      expect(onDelete).toHaveBeenCalled();
    });

    it("should correctly prioritize tag expiration over entry TTL", () => {
      vi.useFakeTimers();

      const ttl = 10000;
      const staleWindow = 5000;
      const now = Date.now();

      cache.set("key", "value", { ttl, staleWindow, tags: "session:xyz" });

      vi.setSystemTime(now + 100);
      cache.invalidateTag("session:xyz");

      const result = cache.get("key", { includeMetadata: true });
      expect(result).toBeUndefined();

      vi.useRealTimers();
    });
  });
});
