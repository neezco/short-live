import { describe, it, expect, vi, beforeEach } from "vitest";

import { LocalTtlCache, ENTRY_STATUS } from "../src/index";

describe("has", () => {
  let cache: LocalTtlCache;

  beforeEach(() => {
    cache = new LocalTtlCache();
  });

  describe("basic existence checks", () => {
    it("should return false for non-existent key", () => {
      expect(cache.has("nonexistent")).toBe(false);
    });

    it("should return true for existing key", () => {
      cache.set("key1", "value1");
      expect(cache.has("key1")).toBe(true);
    });

    it("should return false after deletion", () => {
      cache.set("key1", "value1");
      cache.delete("key1");
      expect(cache.has("key1")).toBe(false);
    });
  });

  describe("status-aware checks", () => {
    it("should return true for FRESH entries", () => {
      cache.set("key", "value", { ttl: 10000 });
      expect(cache.has("key")).toBe(true);
    });

    it("should return true for STALE entries", () => {
      vi.useFakeTimers();

      const ttl = 100;
      const staleWindow = 100;
      const now = Date.now();

      cache.set("key", "value", { ttl, staleWindow });

      vi.setSystemTime(now + ttl + 50);

      expect(cache.has("key")).toBe(true);

      vi.useRealTimers();
    });

    it("should return false for EXPIRED entries", () => {
      vi.useFakeTimers();

      const ttl = 50;
      const now = Date.now();

      cache.set("key", "value", { ttl });

      vi.setSystemTime(now + ttl + 100);

      expect(cache.has("key")).toBe(false);

      vi.useRealTimers();
    });
  });

  describe("consistency with get()", () => {
    it("should match get() for FRESH entries", () => {
      cache.set("key", "value", { ttl: 10000 });

      const hasResult = cache.has("key");
      const getResult = cache.get("key", { includeMetadata: true });

      expect(hasResult).toBe(true);
      expect(getResult).toBeDefined();
      expect(getResult?.status).toBe(ENTRY_STATUS.FRESH);
    });

    it("should match get() for STALE entries", () => {
      vi.useFakeTimers();

      const ttl = 100;
      const staleWindow = 100;
      const now = Date.now();

      cache.set("key", "value", { ttl, staleWindow });

      vi.setSystemTime(now + ttl + 50);

      const hasResult = cache.has("key");
      const getResult = cache.get("key", { includeMetadata: true });

      expect(hasResult).toBe(true);
      expect(getResult).toBeDefined();
      expect(getResult?.status).toBe(ENTRY_STATUS.STALE);

      vi.useRealTimers();
    });

    it("should match get() for EXPIRED entries", () => {
      vi.useFakeTimers();

      const ttl = 50;
      const now = Date.now();

      cache.set("key", "value", { ttl });

      vi.setSystemTime(now + ttl + 100);

      const hasResult = cache.has("key");
      const getResult = cache.get("key", { includeMetadata: true });

      expect(hasResult).toBe(false);
      expect(getResult).toBeUndefined();

      vi.useRealTimers();
    });
  });
});
