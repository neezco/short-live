import { clear } from "./cache/clear";
import { createCache } from "./cache/create-cache";
import { deleteKey } from "./cache/delete";
import { get } from "./cache/get";
import { has } from "./cache/has";
import { invalidateTag } from "./cache/invalidate-tag";
import { setOrUpdate } from "./cache/set";
import type { CacheOptions, CacheState, InvalidateTagOptions } from "./types";

export type { CacheOptions, InvalidateTagOptions } from "./types";

/**
 * A TTL (Time-To-Live) cache implementation with support for expiration,
 * stale windows, tag-based invalidation, and automatic sweeping.
 *
 * Provides O(1) constant-time operations for all core methods.
 *
 * @example
 * ```typescript
 * const cache = new LocalTtlCache();
 * cache.set("user:123", { name: "Alice" }, { ttl: 5 * 60 * 1000 });
 * const user = cache.get("user:123"); // { name: "Alice" }
 * ```
 */
export class LocalTtlCache {
  private state: CacheState;

  /**
   * Creates a new cache instance.
   *
   * @param options - Configuration options for the cache (defaultTtl, defaultStaleWindow, maxSize, etc.)
   *
   * @example
   * ```typescript
   * const cache = new LocalTtlCache({
   *   defaultTtl: 30 * 60 * 1000, // 30 minutes
   *   defaultStaleWindow: 5 * 60 * 1000, // 5 minutes
   *   maxSize: 500_000, // Maximum 500_000 entries
   *   onExpire: (key, value) => console.log(`Expired: ${key}`),
   *   onDelete: (key, value, reason) => console.log(`Deleted: ${key}, reason: ${reason}`),
   * });
   * ```
   */
  constructor(options?: CacheOptions) {
    this.state = createCache(options);
  }

  /**
   * Gets the current number of entries tracked by the cache.
   *
   * This value may include entries that are already expired but have not yet been
   * removed by the lazy cleanup system. Expired keys are cleaned only when it is
   * efficient to do so, so the count can temporarily be higher than the number of
   * actually valid (non‑expired) entries.
   *
   * @returns The number of entries currently stored (including entries pending cleanup)
   *
   * @example
   * ```typescript
   * console.log(cache.size); // e.g., 42
   * ```
   */
  get size(): number {
    return this.state.size;
  }

  /**
   * Retrieves a value from the cache.
   *
   * Returns the value if it exists and is not fully expired. If an entry is in the
   * stale window (expired but still within staleWindow), the stale value is returned.
   *

   * @param key - The key to retrieve
   * @returns The cached value if valid, undefined otherwise
   *
   * @example
   * ```typescript
   * const user = cache.get<{ name: string }>("user:123");
   * ```
   *
   * @edge-cases
   * - Returns `undefined` if the key doesn't exist
   * - Returns `undefined` if the key has expired beyond the stale window
   * - Returns the stale value if within the stale window
   * - If `purgeStaleOnGet` is enabled, stale entries are deleted after being returned
   */
  get<T = unknown>(key: string): T | undefined {
    return get(this.state, key) as T | undefined;
  }

  /**
   * Sets or updates a value in the cache.
   *
   * If the key already exists, it will be completely replaced.
   *
   * @param key - The key under which to store the value
   * @param value - The value to cache (any type)
   * @param options - Optional configuration for this specific entry
   * @param options.ttl - Time-To-Live in milliseconds. Defaults to `defaultTtl`
   * @param options.staleWindow - How long to serve stale data after expiration (milliseconds)
   * @param options.tags - One or more tags for group invalidation
   *
   * @example
   * ```typescript
   * cache.set("user:123", { name: "Alice" }, {
   *   ttl: 5 * 60 * 1000,
   *   staleWindow: 1 * 60 * 1000,
   *   tags: "user:123",
   * });
   * ```
   *
   * @edge-cases
   * - Overwriting an existing key replaces it completely
   * - If `ttl` is 0 or Infinite, the entry never expires
   * - If `staleWindow` is larger than `ttl`, the entry can be served as stale longer than it was fresh
   * - Tags are optional; only necessary for group invalidation via `invalidateTag()`
   */
  set(
    key: string,
    value: unknown,
    options?: {
      ttl?: number;
      staleWindow?: number;
      tags?: string | string[];
    },
  ): void {
    setOrUpdate(this.state, {
      key,
      value,
      ttl: options?.ttl,
      staleWindow: options?.staleWindow,
      tags: options?.tags,
    });
  }

  /**
   * Deletes a specific key from the cache.
   *
   * @param key - The key to delete
   * @returns True if the key was deleted, false if it didn't exist
   *
   * @example
   * ```typescript
   * const wasDeleted = cache.delete("user:123");
   * ```
   *
   * @edge-cases
   * - Triggers the `onDelete` callback with reason `'manual'`
   * - Does not trigger the `onExpire` callback
   * - Returns `false` if the key was already expired
   * - Deleting a non-existent key returns `false` without error
   */
  delete(key: string): boolean {
    return deleteKey(this.state, key);
  }

  /**
   * Checks if a key exists in the cache and is not fully expired.
   *
   * Returns true if the key exists and is either fresh or within the stale window.
   * Use this when you only need to check existence without retrieving the value.
   *
   * @param key - The key to check
   * @returns True if the key exists and is valid, false otherwise
   *
   * @example
   * ```typescript
   * if (cache.has("user:123")) {
   *   // Key exists (either fresh or stale)
   * }
   * ```
   *
   * @edge-cases
   * - Returns `false` if the key doesn't exist
   * - Returns `false` if the key has expired beyond the stale window
   * - Returns `true` if the key is in the stale window (still being served)
   * - Both `has()` and `get()` have O(1) complexity; prefer `get()` if you need the value
   */
  has(key: string): boolean {
    return has(this.state, key);
  }

  /**
   * Removes all entries from the cache at once.
   *
   * This is useful for resetting the cache or freeing memory when needed.
   * The `onDelete` callback is NOT invoked during clear (intentional optimization).
   *
   * @example
   * ```typescript
   * cache.clear(); // cache.size is now 0
   * ```
   *
   * @edge-cases
   * - The `onDelete` callback is NOT triggered during clear
   * - Clears both expired and fresh entries
   * - Resets `cache.size` to 0
   */
  clear(): void {
    // NEXT: optional supor for onClear callback?
    clear(this.state);
  }

  /**
   * Marks all entries with one or more tags as expired (or stale, if requested).
   *
   * If an entry has multiple tags, invalidating ANY of those tags will invalidate the entry.
   *
   * @param tags - A single tag (string) or array of tags to invalidate
   * @param asStale - If true, marks entries as stale instead of fully expired (still served from stale window)
   *
   * @example
   * ```typescript
   * // Invalidate a single tag
   * cache.invalidateTag("user:123");
   *
   * // Invalidate multiple tags
   * cache.invalidateTag(["user:123", "posts:456"]);
   * ```
   *
   * @edge-cases
   * - Does not throw errors if a tag has no associated entries
   * - Invalidating a tag doesn't prevent new entries from being tagged with it later
   * - The `onDelete` callback is triggered with reason `'expired'` (even if `asStale` is true)
   */
  invalidateTag(tags: string | string[], options?: InvalidateTagOptions): void {
    invalidateTag(this.state, tags, options ?? {});
  }
}
