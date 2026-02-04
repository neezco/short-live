import { createCache } from "./cache/create-cache";
import { deleteKey } from "./cache/delete";
import { get } from "./cache/get";
import { invalidateTag } from "./cache/invalidate-tag";
import { setOrUpdate } from "./cache/set";
import type { CacheOptions, CacheState } from "./types";

/**
 * A TTL (Time-To-Live) cache implementation with support for expiration,
 * stale windows, tag-based invalidation, and automatic sweeping.
 */
export class LocalTtlCache {
  private state: CacheState;

  /**
   * Creates a new cache instance.
   * @param options - Configuration options for the cache.
   */
  constructor(options?: CacheOptions) {
    this.state = createCache(options);
  }

  /**
   * Gets the current size of the cache.
   */
  get size(): number {
    return this.state.size;
  }

  /**
   * Retrieves a value from the cache.
   * @param key - The key to retrieve.
   * @returns The cached value if valid, undefined otherwise.
   */
  get<T = unknown>(key: string): T | undefined {
    return get(this.state, key) as T | undefined;
  }

  /**
   * Sets or updates a value in the cache.
   * @param key - The key under which to store the value.
   * @param value - The value to cache.
   * @param options - Optional configuration (ttl, staleWindow, tags).
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
   * Deletes a key from the cache.
   * @param key - The key to delete.
   * @returns True if the key was deleted, false otherwise.
   */
  delete(key: string): boolean {
    return deleteKey(this.state, key);
  }

  /**
   * Invalidates one or more tags.
   * @param tags - A tag or list of tags to invalidate.
   * @param asStale - Whether to mark as stale instead of expired.
   */
  invalidateTag(tags: string | string[], asStale?: boolean): void {
    invalidateTag(this.state, tags, { asStale });
  }
}
