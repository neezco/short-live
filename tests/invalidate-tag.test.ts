import { describe, it, expect, beforeEach } from "vitest";

import { createCache, _resetInstanceCount } from "../src/cache/create-cache";
import { get } from "../src/cache/get";
import { invalidateTag } from "../src/cache/invalidate-tag";
import { setOrUpdate } from "../src/cache/set";

describe("invalidateTag", () => {
  beforeEach(() => {
    _resetInstanceCount();
  });

  const now = Date.now();

  it("should mark a single tag as expired immediately", () => {
    const state = createCache();

    invalidateTag(state, "tag1", {}, now);

    const tagTimestamp = state._tags.get("tag1");
    expect(tagTimestamp).toBeDefined();
    expect(tagTimestamp![0]).toBe(now); // createdAt
    expect(tagTimestamp![1]).toBe(now); // expiresAt (immediate)
    expect(tagTimestamp![2]).toBe(0); // staleExpiresAt (no staleWindow)
  });

  it("should mark multiple tags at once", () => {
    const state = createCache();

    invalidateTag(state, ["tag1", "tag2", "tag3"], {}, now);

    expect(state._tags.get("tag1")).toBeDefined();
    expect(state._tags.get("tag2")).toBeDefined();
    expect(state._tags.get("tag3")).toBeDefined();
  });

  it("should apply delayMs to tag expiration", () => {
    const state = createCache();
    const delayMs = 5000;

    invalidateTag(state, "tag1", { delayMs }, now);

    const tagTimestamp = state._tags.get("tag1");
    expect(tagTimestamp![1]).toBe(now + delayMs);
  });

  it("should apply staleWindowMs after the expiration moment", () => {
    const state = createCache();
    const delayMs = 1000;
    const staleWindowMs = 2000;

    invalidateTag(state, "tag1", { delayMs, staleWindowMs }, now);

    const tagTimestamp = state._tags.get("tag1");
    expect(tagTimestamp![1]).toBe(now + delayMs); // expiresAt
    expect(tagTimestamp![2]).toBe(now + delayMs + staleWindowMs); // staleExpiresAt
  });

  it("should use earlier tag expiration when tag expires before entry", () => {
    const state = createCache();

    // Set entry with long TTL
    const entryTtl = 10000;
    setOrUpdate(state, { key: "key1", value: "value1", ttl: entryTtl, tags: "tag1" }, now);

    // Invalidate tag with earlier expiration
    const tagDelayMs = 2000;
    invalidateTag(state, "tag1", { delayMs: tagDelayMs }, now);

    // At time when tag expires but entry is still fresh
    const getTime = now + 3000;

    // Entry should be undefined because tag expires earlier (at now + 2000)
    expect(get(state, "key1", getTime)).toBe(undefined);
  });

  it("should use later entry expiration when entry expires before tag", () => {
    const state = createCache();

    // Set entry with short TTL
    const entryTtl = 2000;
    setOrUpdate(state, { key: "key1", value: "value1", ttl: entryTtl, tags: "tag1" }, now);

    // Invalidate tag with later expiration
    const tagDelayMs = 10000;
    invalidateTag(state, "tag1", { delayMs: tagDelayMs }, now);

    // At time when entry expires but tag is still fresh
    const getTime = now + 3000;

    // Entry should be undefined because entry expires earlier (at now + 2000)
    expect(get(state, "key1", getTime)).toBe(undefined);
  });

  it("should apply stricter stale expiration from tag when tag is created after entry", () => {
    const state = createCache();

    // Set entry at time T0 with staleWindow
    const entryTtl = 1000;
    const entryStaleWindow = 5000;
    setOrUpdate(
      state,
      {
        key: "key1",
        value: "value1",
        ttl: entryTtl,
        staleWindow: entryStaleWindow,
        tags: "tag1",
      },
      now,
    );

    // Entry: expiresAt = now + 1000, staleExpiresAt = now + 6000

    // Invalidate tag at T0 + 500 (after entry creation) with shorter staleWindow
    const tagCreationTime = now + 500;
    const tagDelayMs = 600; // tag expiresAt at now + 1100
    const tagStaleWindowMs = 1000; // tag staleExpiresAt at now + 2100
    invalidateTag(
      state,
      "tag1",
      { delayMs: tagDelayMs, staleWindowMs: tagStaleWindowMs },
      tagCreationTime,
    );

    // Between expiresAt (now + 1000) and tag's staleExpiresAt (now + 2100)
    // The tag's stricter staleExpiration should apply
    const getTime = now + 2000;
    expect(get(state, "key1", getTime)).toBe("value1"); // Still stale-valid

    // After tag's staleExpiresAt (now + 2100)
    const getTime2 = now + 2200;
    expect(get(state, "key1", getTime2)).toBe(undefined); // Expired due to tag
  });

  it("should ignore tags created before the entry", () => {
    const state = createCache();

    // Create tag at T0
    invalidateTag(state, "tag1", { delayMs: 500 }, now);

    // Set entry at T0 + 100 (after tag creation)
    const entryTime = now + 100;
    setOrUpdate(state, { key: "key1", value: "value1", ttl: 10000, tags: "tag1" }, entryTime);

    // Tag was created BEFORE entry, so it should be ignored
    // Entry should remain valid despite tag being "older"
    const getTime = now + 200;
    expect(get(state, "key1", getTime)).toBe("value1");
  });

  it("should handle entry with multiple tags - all tags must override if stricter", () => {
    const state = createCache();

    // Set entry with long TTL and multiple tags
    const entryTtl = 10000;
    setOrUpdate(
      state,
      { key: "key1", value: "value1", ttl: entryTtl, tags: ["tag1", "tag2", "tag3"] },
      now,
    );

    // Invalidate tag1 with short delay
    invalidateTag(state, "tag1", { delayMs: 2000 }, now);

    // Invalidate tag2 with medium delay
    invalidateTag(state, "tag2", { delayMs: 5000 }, now);

    // Invalidate tag3 with long delay
    invalidateTag(state, "tag3", { delayMs: 8000 }, now);

    // The entry should expire at the earliest tag expiration (2000ms)
    const getTime = now + 3000;
    expect(get(state, "key1", getTime)).toBe(undefined);
  });

  it("should handle staleWindow from multiple tags - earliest staleExpiration wins", () => {
    const state = createCache();

    // Set entry that is long-lived but expires at specific point with staleWindow
    const entryTtl = 5000;
    const entryStaleWindow = 4000; // staleExpiresAt = now + 9000
    setOrUpdate(
      state,
      {
        key: "key1",
        value: "value1",
        ttl: entryTtl,
        staleWindow: entryStaleWindow,
        tags: ["tag1", "tag2"],
      },
      now,
    );

    // tag1 expires at now + 3000 with staleWindow that extends to now + 7000
    invalidateTag(state, "tag1", { delayMs: 3000, staleWindowMs: 4000 }, now);

    // tag2 expires at now + 6000 with staleWindow that extends to now + 10000
    invalidateTag(state, "tag2", { delayMs: 6000, staleWindowMs: 4000 }, now);

    // At now + 7100: between tag1's staleExpiration (7000) and entry's staleExpiration (9000)
    // Should be expired because tag1 was stricter
    const getTime = now + 7100;
    expect(get(state, "key1", getTime)).toBe(undefined);
  });

  it("should handle tag invalidation without delayMs and staleWindowMs", () => {
    const state = createCache();

    // Set entry with tags
    setOrUpdate(state, { key: "key1", value: "value1", ttl: 5000, tags: "tag1" }, now);

    // Invalidate immediately without options
    invalidateTag(state, "tag1", {}, now);

    const tagTimestamp = state._tags.get("tag1");
    expect(tagTimestamp![1]).toBe(now); // expiresAt = now (immediate)
    expect(tagTimestamp![2]).toBe(0); // staleExpiresAt = 0 (no stale window, follows set.ts logic)

    // Entry should be immediately expired
    expect(get(state, "key1", now + 100)).toBe(undefined);
  });

  it("should allow tag to override entry with infinite staleWindow", () => {
    const state = createCache();

    // Set entry that would be stale-valid forever
    setOrUpdate(
      state,
      {
        key: "key1",
        value: "value1",
        ttl: 1000,
        staleWindow: Infinity,
        tags: "tag1",
      },
      now,
    );
    // Entry: expiresAt = now + 1000, staleExpiresAt = Infinity

    // Invalidate tag with finite staleWindow, created AFTER entry
    // This allows tag to override entry's infinite staleWindow
    const tagCreationTime = now + 100;
    invalidateTag(state, "tag1", { delayMs: 1500, staleWindowMs: 1000 }, tagCreationTime);
    // Tag: expiresAt = now + 1600, staleExpiresAt = now + 2600

    // At now + 2000: entry has expired (now + 1000) but still within tag's staleExpiration (now + 2600)
    const getTime = now + 2000;
    expect(get(state, "key1", getTime)).toBe("value1"); // stale-valid due to tag

    // At now + 2700: beyond both expirations
    const getTime2 = now + 2700;
    expect(get(state, "key1", getTime2)).toBe(undefined); // expired due to tag's staleExpiration
  });

  it("should re-invalidate a tag with new parameters", () => {
    const state = createCache();

    // Set entry with tags
    setOrUpdate(state, { key: "key1", value: "value1", ttl: 10000, tags: "tag1" }, now);

    // First invalidation
    invalidateTag(state, "tag1", { delayMs: 5000 }, now);
    expect(get(state, "key1", now + 3000)).toBe("value1");

    // Re-invalidate with stricter parameters
    invalidateTag(state, "tag1", { delayMs: 2000 }, now);

    // Should now expire earlier
    expect(get(state, "key1", now + 2500)).toBe(undefined);
  });

  it("should handle empty tag list gracefully", () => {
    const state = createCache();

    // Should not throw
    expect(() => invalidateTag(state, [], {}, now)).not.toThrow();

    // No tags should be created
    expect(state._tags.size).toBe(0);
  });

  it("should merge tag timestamps correctly with entry that has no staleWindow", () => {
    const state = createCache();

    // Entry with no staleWindow: staleExpiresAt = 0
    setOrUpdate(state, { key: "key1", value: "value1", ttl: 5000, tags: "tag1" }, now);

    // Tag with staleWindow created after entry
    const tagCreationTime = now + 100;
    invalidateTag(state, "tag1", { delayMs: 1000, staleWindowMs: 2000 }, tagCreationTime);

    // At now + 1500: entry expires at now + 1100 (due to tag),
    // tag staleExpiration at now + 3100 (tagCreation + delayMs + staleWindowMs)
    // But entry has no staleWindow (0), so comparison 3100 < 0 is false
    // mergedStaleExpiresAt remains 0, so it's simply expired
    const getTime = now + 1500;
    expect(get(state, "key1", getTime)).toBe(undefined); // expired due to tag, no stale window from entry
  });

  it("should apply tag staleWindow when entry has staleWindow - tag created after", () => {
    const state = createCache();

    // Entry with staleWindow
    setOrUpdate(
      state,
      {
        key: "key1",
        value: "value1",
        ttl: 3000,
        staleWindow: 5000,
        tags: "tag1",
      },
      now,
    );
    // Entry: expiresAt = now + 3000, staleExpiresAt = now + 8000

    // Tag created after entry with earlier staleExpiration
    const tagCreationTime = now + 100;
    invalidateTag(state, "tag1", { delayMs: 1000, staleWindowMs: 2000 }, tagCreationTime);
    // Tag: expiresAt = now + 1100, staleExpiresAt = now + 3100

    // After entry's expiration but before tag's staleExpiration
    const getTime = now + 2000;
    expect(get(state, "key1", getTime)).toBe("value1"); // stale-valid due to tag's stricter staleWindow

    // After tag's staleExpiration
    const getTime2 = now + 3200;
    expect(get(state, "key1", getTime2)).toBe(undefined); // expired due to tag's staleExpiration
  });
});
