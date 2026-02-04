import { describe, it, expect } from "vitest";

import { createCache } from "../src/cache/create-cache";
import { isFresh, isStale, isExpired, isValid } from "../src/cache/validators";
import type { CacheEntry } from "../src/types";

describe("validators", () => {
  const state = createCache();
  const now = Date.now();
  const entry: CacheEntry = [
    [
      now,
      now + 1000, // expires in 1 second
      now + 2000, // stale expires in 2 seconds]
    ],
    "value",
    null,
  ];

  describe("isFresh", () => {
    it("should return true if now is before expiresAt", () => {
      expect(isFresh(state, entry, now)).toBe(true);
      expect(isFresh(state, entry, now + 500)).toBe(true);
    });

    it("should return false if now is at or after expiresAt", () => {
      expect(isFresh(state, entry, now + 1000)).toBe(false);
      expect(isFresh(state, entry, now + 1500)).toBe(false);
    });
  });

  describe("isStale", () => {
    it("should return false if now is before expiresAt", () => {
      expect(isStale(state, entry, now)).toBe(false);
      expect(isStale(state, entry, now + 500)).toBe(false);
    });

    it("should return true if now is between expiresAt and staleExpiresAt", () => {
      expect(isStale(state, entry, now + 1000)).toBe(true);
      expect(isStale(state, entry, now + 1500)).toBe(true);
    });

    it("should return false if now is at or after staleExpiresAt", () => {
      expect(isStale(state, entry, now + 2000)).toBe(false);
      expect(isStale(state, entry, now + 2500)).toBe(false);
    });

    it("should return false if staleExpiresAt is 0", () => {
      const entryNoStale: CacheEntry = [[now, now + 1000, 0], "value", null];
      expect(isStale(state, entryNoStale, now + 1500)).toBe(false);
    });
  });

  describe("isExpired", () => {
    it("should return false if now is before expiresAt", () => {
      expect(isExpired(state, entry, now)).toBe(false);
      expect(isExpired(state, entry, now + 500)).toBe(false);
    });

    it("should return false if now is between expiresAt and staleExpiresAt", () => {
      expect(isExpired(state, entry, now + 1000)).toBe(false);
      expect(isExpired(state, entry, now + 1500)).toBe(false);
    });

    it("should return true if now is at or after staleExpiresAt", () => {
      expect(isExpired(state, entry, now + 2000)).toBe(true);
      expect(isExpired(state, entry, now + 2500)).toBe(true);
    });

    it("should return true if now is at or after expiresAt when no staleTTL", () => {
      const entryNoStale: CacheEntry = [[now, now + 1000, 0], "value", null];
      expect(isExpired(state, entryNoStale, now + 1000)).toBe(true);
      expect(isExpired(state, entryNoStale, now + 1500)).toBe(true);
    });
  });

  describe("isValid", () => {
    it("should return false for non-existent entry", () => {
      expect(isValid(state, null)).toBe(false);
      expect(isValid(state, undefined)).toBe(false);
    });

    it("should return true for fresh entry", () => {
      expect(isValid(state, entry, now)).toBe(true);
      expect(isValid(state, entry, now + 500)).toBe(true);
    });

    it("should return true for stale entry", () => {
      expect(isValid(state, entry, now + 1000)).toBe(true);
      expect(isValid(state, entry, now + 1500)).toBe(true);
    });

    it("should return false for expired entry", () => {
      expect(isValid(state, entry, now + 2000)).toBe(false);
      expect(isValid(state, entry, now + 2500)).toBe(false);
    });

    it("should return false for expired entry without staleTTL", () => {
      const entryNoStale: CacheEntry = [[now, now + 1000, 0], "value", null];
      expect(isValid(state, entryNoStale, now + 1000)).toBe(false);
      expect(isValid(state, entryNoStale, now + 1500)).toBe(false);
    });
  });
});
