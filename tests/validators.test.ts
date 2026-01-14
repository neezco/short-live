import { describe, it, expect } from "vitest";

import { isFresh, isStale, isExpired, isValid } from "../src/cache/validators";
import type { CacheEntry } from "../src/types";

describe("validators", () => {
  const now = Date.now();
  const entry: CacheEntry = {
    v: "value",
    e: now + 1000, // expires in 1 second
    se: now + 2000, // stale expires in 2 seconds
  };

  describe("isFresh", () => {
    it("should return true if now is before expiresAt", () => {
      expect(isFresh(entry, now)).toBe(true);
      expect(isFresh(entry, now + 500)).toBe(true);
    });

    it("should return false if now is at or after expiresAt", () => {
      expect(isFresh(entry, now + 1000)).toBe(false);
      expect(isFresh(entry, now + 1500)).toBe(false);
    });
  });

  describe("isStale", () => {
    it("should return false if now is before expiresAt", () => {
      expect(isStale(entry, now)).toBe(false);
      expect(isStale(entry, now + 500)).toBe(false);
    });

    it("should return true if now is between expiresAt and staleExpiresAt", () => {
      expect(isStale(entry, now + 1000)).toBe(true);
      expect(isStale(entry, now + 1500)).toBe(true);
    });

    it("should return false if now is at or after staleExpiresAt", () => {
      expect(isStale(entry, now + 2000)).toBe(false);
      expect(isStale(entry, now + 2500)).toBe(false);
    });

    it("should return false if staleExpiresAt is 0", () => {
      const entryNoStale: CacheEntry = { v: "value", e: now + 1000, se: 0 };
      expect(isStale(entryNoStale, now + 1500)).toBe(false);
    });
  });

  describe("isExpired", () => {
    it("should return false if now is before expiresAt", () => {
      expect(isExpired(entry, now)).toBe(false);
      expect(isExpired(entry, now + 500)).toBe(false);
    });

    it("should return false if now is between expiresAt and staleExpiresAt", () => {
      expect(isExpired(entry, now + 1000)).toBe(false);
      expect(isExpired(entry, now + 1500)).toBe(false);
    });

    it("should return true if now is at or after staleExpiresAt", () => {
      expect(isExpired(entry, now + 2000)).toBe(true);
      expect(isExpired(entry, now + 2500)).toBe(true);
    });

    it("should return true if now is at or after expiresAt when no staleTTL", () => {
      const entryNoStale: CacheEntry = { v: "value", e: now + 1000, se: 0 };
      expect(isExpired(entryNoStale, now + 1000)).toBe(true);
      expect(isExpired(entryNoStale, now + 1500)).toBe(true);
    });
  });

  describe("isValid", () => {
    it("should return false for non-existent entry", () => {
      expect(isValid(null)).toBe(false);
      expect(isValid(undefined)).toBe(false);
    });

    it("should return true for fresh entry", () => {
      expect(isValid(entry, now)).toBe(true);
      expect(isValid(entry, now + 500)).toBe(true);
    });

    it("should return true for stale entry", () => {
      expect(isValid(entry, now + 1000)).toBe(true);
      expect(isValid(entry, now + 1500)).toBe(true);
    });

    it("should return false for expired entry", () => {
      expect(isValid(entry, now + 2000)).toBe(false);
      expect(isValid(entry, now + 2500)).toBe(false);
    });

    it("should return false for expired entry without staleTTL", () => {
      const entryNoStale: CacheEntry = { v: "value", e: now + 1000, se: 0 };
      expect(isValid(entryNoStale, now + 1000)).toBe(false);
      expect(isValid(entryNoStale, now + 1500)).toBe(false);
    });
  });
});
