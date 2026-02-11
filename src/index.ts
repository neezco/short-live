import { clear } from "./cache/clear";
import { createCache } from "./cache/create-cache";
import { deleteKey } from "./cache/delete";
import { get, getWithStatus } from "./cache/get";
import { has } from "./cache/has";
import { invalidateTag } from "./cache/invalidate-tag";
import { setOrUpdate } from "./cache/set";
import type {
  GetOptionsWithMetadata,
  GetOptionsWithoutMetadata,
  SetOptions,
  LocalTtlCacheInterface,
  CacheOptions,
  CacheState,
  EntryMetadata,
  InvalidateTagOptions,
} from "./types";

// Re-export public types
export type {
  CacheOptions,
  InvalidateTagOptions,
  EntryMetadata,
  GetOptionsWithMetadata,
  GetOptionsWithoutMetadata,
  SetOptions,
  LocalTtlCacheInterface,
  ENTRY_STATUS,
  PurgeMode,
} from "./types";

/**
 * A TTL (Time-To-Live) cache implementation with support for expiration,
 * stale windows, tag-based invalidation, and smart automatic sweeping.
 *
 * Provides O(1) constant-time operations for all core methods with support for:
 * - Expiration and stale windows
 * - Tag-based invalidation
 * - Automatic sweeping
 */
export class LocalTtlCache implements LocalTtlCacheInterface {
  private state: CacheState;

  /**
   * Creates a new cache instance.
   *
   * @param options - Configuration options for the cache (defaultTtl, defaultStaleWindow, maxSize, etc.)
   *
   */
  constructor(options?: CacheOptions) {
    this.state = createCache(options);
  }

  get size(): number {
    return this.state.size;
  }

  get<T = unknown>(key: string): T | undefined;
  get<T = unknown>(key: string, options: GetOptionsWithMetadata): EntryMetadata<T> | undefined;
  get<T = unknown>(key: string, options: GetOptionsWithoutMetadata): T | undefined;
  get<T = unknown>(
    key: string,
    options?: GetOptionsWithoutMetadata | GetOptionsWithMetadata,
  ): T | undefined | EntryMetadata<T> {
    if (options?.includeMetadata === true) {
      const [status, entry] = getWithStatus(this.state, key, options.purgeStale);
      if (!entry) return undefined;

      const [timestamps, value, tags] = entry;
      const [, expiresAt, staleExpiresAt] = timestamps;

      return {
        data: value as T,
        expirationTime: expiresAt,
        staleWindowExpiration: staleExpiresAt,
        status,
        tags,
      } as EntryMetadata<T>;
    }

    return get(this.state, key, options?.purgeStale) as T | undefined;
  }

  set(key: string, value: unknown, options?: SetOptions): boolean {
    return setOrUpdate(this.state, {
      key,
      value,
      ttl: options?.ttl,
      staleWindow: options?.staleWindow,
      tags: options?.tags,
    });
  }

  delete(key: string): boolean {
    return deleteKey(this.state, key);
  }

  has(key: string): boolean {
    return has(this.state, key);
  }

  clear(): void {
    clear(this.state);
  }

  invalidateTag(tags: string | string[], options?: InvalidateTagOptions): void {
    invalidateTag(this.state, tags, options ?? {});
  }
}
