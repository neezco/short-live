import { describe, it, expect, vi, beforeEach } from "vitest";

import { LocalTtlCache, ENTRY_STATUS } from "../src/index";

describe("get", () => {
  let cache: LocalTtlCache;

  beforeEach(() => {
    cache = new LocalTtlCache();
  });

  describe("basic retrieval", () => {
    it("should return undefined for non-existent key", () => {
      expect(cache.get("nonexistent")).toBeUndefined();
    });

    it("should return value for existing key", () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");
    });

    it("should return different data types", () => {
      cache.set("str", "hello");
      cache.set("num", 42);
      cache.set("obj", { a: 1 });
      cache.set("nil", null);

      expect(cache.get("str")).toBe("hello");
      expect(cache.get("num")).toBe(42);
      expect(cache.get("obj")).toEqual({ a: 1 });
      expect(cache.get("nil")).toBe(null);
    });
  });

  describe("metadata", () => {
    it("should return metadata when requested", () => {
      cache.set("key1", "myValue");

      const result = cache.get("key1", { includeMetadata: true });
      expect(result).toBeDefined();
      expect(result?.data).toBe("myValue");
    });

    it("should return consistent metadata on repeated gets", () => {
      cache.set("key", "value", {
        ttl: 10000,
        staleWindow: 5000,
        tags: ["tag1"],
      });

      const result1 = cache.get("key", { includeMetadata: true });
      const result2 = cache.get("key", { includeMetadata: true });

      expect(result1?.expirationTime).toBe(result2?.expirationTime);
      expect(result1?.staleWindowExpiration).toBe(result2?.staleWindowExpiration);
      expect(result1?.status).toBe(result2?.status);
      expect(result1?.tags).toEqual(result2?.tags);
    });

    it("should include all metadata fields correctly", () => {
      cache.set(
        "key",
        { nested: "data" },
        {
          ttl: 5000,
          staleWindow: 2000,
          tags: ["category", "priority"],
        },
      );

      const result = cache.get("key", { includeMetadata: true });
      expect(result).toBeDefined();
      if (result) {
        expect(result.data).toEqual({ nested: "data" });
        expect(result.status).toBe(ENTRY_STATUS.FRESH);
        expect(result.expirationTime).toBeGreaterThan(Date.now());
        expect(result.staleWindowExpiration).toBeGreaterThan(result.expirationTime);
        expect(result.tags).toEqual(["category", "priority"]);
      }
    });
  });

  describe("entry status: FRESH state", () => {
    it("should return FRESH status for entry within TTL", () => {
      cache.set("key", "value", { ttl: 10000 });

      const result = cache.get("key", { includeMetadata: true });
      expect(result).toBeDefined();
      expect(result?.status).toBe(ENTRY_STATUS.FRESH);
      expect(result?.data).toBe("value");
    });

    it("should be accessible without stale window", () => {
      cache.set("key", "value", { ttl: 5000 });

      const result = cache.get("key", { includeMetadata: true });
      expect(result).toBeDefined();
      expect(cache.has("key")).toBe(true);
      expect(result?.status).toBe(ENTRY_STATUS.FRESH);
    });

    it("should reflect correct expirationTime in metadata", () => {
      const beforeSet = Date.now();
      cache.set("key", "value", { ttl: 5000 });
      const afterSet = Date.now();

      const result = cache.get("key", { includeMetadata: true });
      expect(result).toBeDefined();
      if (result) {
        expect(result.expirationTime).toBeGreaterThanOrEqual(beforeSet + 5000);
        expect(result.expirationTime).toBeLessThanOrEqual(afterSet + 5000);
      }
    });

    it("should use default TTL when not specified", () => {
      const customCache = new LocalTtlCache({ defaultTtl: 3000 });
      customCache.set("key", "value");

      const result = customCache.get("key", { includeMetadata: true });
      expect(result).toBeDefined();
      expect(result?.status).toBe(ENTRY_STATUS.FRESH);
    });
  });

  describe("entry status: STALE state", () => {
    it("should transition from FRESH to STALE when TTL expires but stale window active", () => {
      const ttl = 100;
      const staleWindow = 200;

      cache.set("key", "value", { ttl, staleWindow });

      let result = cache.get("key", { includeMetadata: true });
      expect(result?.status).toBe(ENTRY_STATUS.FRESH);

      vi.useFakeTimers();
      vi.setSystemTime(Date.now() + ttl + 50);

      result = cache.get("key", { includeMetadata: true });
      expect(result).toBeDefined();
      expect(result?.status).toBe(ENTRY_STATUS.STALE);
      expect(result?.data).toBe("value");

      vi.useRealTimers();
    });

    it("should include staleWindowExpiration in metadata when stale window is set", () => {
      const ttl = 1000;
      const staleWindow = 2000;

      cache.set("key", "value", { ttl, staleWindow });

      const result = cache.get("key", { includeMetadata: true });
      expect(result).toBeDefined();
      if (result) {
        expect(result.staleWindowExpiration).toBeGreaterThan(result.expirationTime);
        expect(result.staleWindowExpiration - result.expirationTime).toBe(staleWindow);
      }
    });

    it("should serve stale entries when accessing them", () => {
      vi.useFakeTimers();

      const ttl = 100;
      const staleWindow = 300;
      const now = Date.now();

      cache.set("key", "stale-value", { ttl, staleWindow });

      vi.setSystemTime(now + ttl + 50);

      const result = cache.get("key", { includeMetadata: true });
      expect(result).toBeDefined();
      expect(result?.status).toBe(ENTRY_STATUS.STALE);
      expect(result?.data).toBe("stale-value");

      vi.useRealTimers();
    });

    it("should respect default stale window when not specified", () => {
      const customCache = new LocalTtlCache({
        defaultTtl: 1000,
        defaultStaleWindow: 500,
      });

      customCache.set("key", "value");

      const result = customCache.get("key", { includeMetadata: true });
      expect(result).toBeDefined();
      if (result) {
        expect(result.staleWindowExpiration - result.expirationTime).toBe(500);
      }
    });

    it("should handle stale window boundary precisely", () => {
      vi.useFakeTimers();

      const ttl = 100;
      const staleWindow = 100;
      const now = Date.now();

      cache.set("key", "value", { ttl, staleWindow });

      vi.setSystemTime(now + ttl + 1);
      let result = cache.get("key", { includeMetadata: true });
      expect(result?.status).toBe(ENTRY_STATUS.STALE);

      vi.setSystemTime(now + ttl + staleWindow);
      result = cache.get("key", { includeMetadata: true });
      if (result) {
        expect(result.status).toBe(ENTRY_STATUS.STALE);
      }

      vi.setSystemTime(now + ttl + staleWindow + 1);
      result = cache.get("key", { includeMetadata: true });
      expect(result).toBeUndefined();

      vi.useRealTimers();
    });
  });

  describe("entry status: EXPIRED state", () => {
    it("should return undefined when both TTL and stale window expire", () => {
      vi.useFakeTimers();

      const ttl = 100;
      const staleWindow = 100;
      const now = Date.now();

      cache.set("key", "value", { ttl, staleWindow });

      vi.setSystemTime(now + ttl + staleWindow + 10);

      const result = cache.get("key", { includeMetadata: true });
      expect(result).toBeUndefined();
      expect(cache.has("key")).toBe(false);

      vi.useRealTimers();
    });

    it("should auto-remove expired entries on get", () => {
      vi.useFakeTimers();

      const ttl = 50;
      const now = Date.now();

      cache.set("key", "value", { ttl });
      expect(cache.size).toBe(1);

      vi.setSystemTime(now + ttl + 100);

      expect(cache.get("key")).toBe(undefined);
      expect(cache.has("key")).toBe(false);

      vi.useRealTimers();
    });

    it("should transition straight from FRESH to EXPIRED if no stale window", () => {
      vi.useFakeTimers();

      const ttl = 100;
      const now = Date.now();

      cache.set("key", "value", { ttl, staleWindow: 0 });

      let result = cache.get("key", { includeMetadata: true });
      expect(result?.status).toBe(ENTRY_STATUS.FRESH);

      vi.setSystemTime(now + ttl + 10);

      result = cache.get("key", { includeMetadata: true });
      expect(result).toBeUndefined();

      vi.useRealTimers();
    });

    it("should handle entries with no stale window (0 or Infinity TTL)", () => {
      cache.set("key1", "value1", { ttl: 0 });
      cache.set("key2", "value2", { ttl: Infinity });

      let result = cache.get("key1", { includeMetadata: true });
      expect(result?.status).toBe(ENTRY_STATUS.FRESH);
      expect(result?.staleWindowExpiration).toBe(0);

      result = cache.get("key2", { includeMetadata: true });
      expect(result?.status).toBe(ENTRY_STATUS.FRESH);
      expect(result?.staleWindowExpiration).toBe(0);
    });
  });

  describe("consistency with has()", () => {
    it("should ensure has() matches get() for FRESH entries", () => {
      cache.set("key", "value", { ttl: 10000 });

      expect(cache.has("key")).toBe(true);

      const result = cache.get("key", { includeMetadata: true });
      expect(result).toBeDefined();
    });

    it("should ensure has() returns true for STALE entries", () => {
      vi.useFakeTimers();

      const ttl = 100;
      const staleWindow = 100;
      const now = Date.now();

      cache.set("key", "value", { ttl, staleWindow });

      vi.setSystemTime(now + ttl + 50);

      expect(cache.has("key")).toBe(true);

      const result = cache.get("key", { includeMetadata: true });
      expect(result).toBeDefined();

      vi.useRealTimers();
    });

    it("should ensure has() returns false for EXPIRED entries", () => {
      vi.useFakeTimers();

      const ttl = 50;
      const now = Date.now();

      cache.set("key", "value", { ttl });

      vi.setSystemTime(now + ttl + 100);

      expect(cache.has("key")).toBe(false);

      const result = cache.get("key", { includeMetadata: true });
      expect(result).toBeUndefined();

      vi.useRealTimers();
    });
  });
});
