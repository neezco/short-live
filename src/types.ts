import type { DELETE_REASON } from "./cache/delete";

/**
 * Base configuration shared between CacheOptions and CacheState.
 */
export interface CacheConfigBase {
  /**
   * Callback invoked when a key expires naturally.
   * @param key - The expired key.
   * @param value - The value associated with the expired key.
   * @param reason - The reason for deletion ('expired', or 'stale').
   */
  onExpire?: (
    key: string,
    value: unknown,
    reason: Exclude<DELETE_REASON, DELETE_REASON.MANUAL>,
  ) => void;

  /**
   * Callback invoked when a key is deleted, either manually or due to expiration.
   * @param key - The deleted key.
   * @param value - The value of the deleted key.
   * @param reason - The reason for deletion ('manual', 'expired', or 'stale').
   */
  onDelete?: (key: string, value: unknown, reason: DELETE_REASON) => void;

  /**
   * Default TTL (Time-To-Live) in milliseconds for entries without explicit TTL.
   * @default 1_800_000 (30 minutes)
   */
  defaultTtl: number;

  /**
   * Default stale window in milliseconds for entries that do not
   * specify their own `staleWindowMs`.
   *
   * This window determines how long an entry may continue to be
   * served as stale after it reaches its expiration time.
   *
   * The window is always relative to the entry’s own expiration
   * moment, regardless of whether that expiration comes from an
   * explicit `ttl` or from the cache’s default TTL.
   * @default null (No stale window)
   */
  defaultStaleWindow: number;

  /**
   * Maximum number of entries the cache can hold.
   * Beyond this limit, new entries are ignored.
   * @default Infinite (unlimited)
   */
  maxSize: number;

  /**
   * Maximum memory size in MB the cache can use.
   * Beyond this limit, new entries are ignored.
   * @default Infinite (unlimited)
   */
  maxMemorySize: number;

  /**
   * Controls how stale entries are handled when read from the cache.
   *
   * - true  → stale entries are purged immediately after being returned.
   * - false → stale entries are retained after being returned.
   *
   * @default false
   */
  purgeStaleOnGet: boolean;

  /**
   * Controls how stale entries are handled during sweep operations.
   *
   * - true  → stale entries are purged during sweeps.
   * - false → stale entries are retained during sweeps.
   *
   * @default false
   */
  purgeStaleOnSweep: boolean;

  /**
   * Whether to automatically start the sweep process when the cache is created.
   *
   * - true  → sweep starts automatically.
   * - false → sweep does not start automatically, allowing manual control.
   *
   * @internal
   * @default true
   */
  _autoStartSweep: boolean;

  /**
   * Allowed expired ratio for the cache instance.
   */
  _maxAllowExpiredRatio: number;
}

/**
 * Public configuration options for the TTL cache.
 */
export type CacheOptions = Partial<CacheConfigBase>;

/**
 * Options for `invalidateTag` operation. Kept intentionally extensible so
 * future flags can be added without breaking callers.
 */
export interface InvalidateTagOptions {
  /** If true, mark affected entries as stale instead of fully expired. */
  asStale?: boolean;

  // Allow additional option fields for forward-compatibility.
  [key: string]: unknown;
}

/**
 *  Lifecycle timestamps stored in a Tuple:
 *  - 0 → createdAt
 *  - 1 → expiresAt
 *  - 2 → staleExpiresAt
 */
export type EntryTimestamp = [
  /** createdAt: Absolute timestamp the entry was created (Date.now()). */
  number,

  /** expiresAt: Absolute timestamp when the entry becomes invalid (Date.now() + TTL). */
  number,

  /** staleExpiresAt: Absolute timestamp when the entry stops being stale (Date.now() + staleTTL). */
  number,
];

/**
 * Represents a single cache entry.
 */
export type CacheEntry = [
  EntryTimestamp,

  /** The stored value. */
  unknown,

  (
    /**
     * Optional list of tags associated with this entry.
     *  Tags can be used for:
     *  - Group invalidation (e.g., clearing all entries with a given tag)
     *  - Namespacing or categorization
     *  - Tracking dependencies
     *
     *  If no tags are associated, this field is `null`.
     */
    string[] | null
  ),
];

/**
 * Status of a cache entry.
 */
export enum ENTRY_STATUS {
  /** The entry is fresh and valid. */
  FRESH = "fresh",
  /** The entry is stale but can still be served. */
  STALE = "stale",
  /** The entry has expired and is no longer valid. */
  EXPIRED = "expired",
}

/**
 * Metadata returned when includeMetadata is enabled in get().
 * Contains complete information about a cache entry including
 * timing, status, and associated tags.
 */
export interface EntryMetadata<T = unknown> {
  /** The cached value. */
  data: T;

  /** Absolute timestamp when this entry becomes fully expired (in milliseconds). */
  expirationTime: number;

  /** Absolute timestamp when the stale window expires (in milliseconds). */
  staleWindowExpiration: number;

  /** Current status of the entry (fresh, stale, or expired). */
  status: ENTRY_STATUS;

  /** Tags associated with this entry, or null if no tags are set. */
  tags: string[] | null;
}

/**
 * Internal state of the TTL cache.
 */
export interface CacheState extends CacheConfigBase {
  /** Map storing key-value entries. */
  store: Map<string, CacheEntry>;

  /** Current size */
  size: number;

  /** Iterator for sweeping keys. */
  _sweepIter: MapIterator<[string, CacheEntry]> | null;

  /** Index of this instance for sweep all. */
  _instanceIndexState: number;

  /** Expire ratio avg for instance */
  _expiredRatio: number;

  /** Sweep weight for instance, calculate based on size and _expiredRatio */
  _sweepWeight: number;

  /**
   * Tag invalidation state.
   * Each tag stores:
   * - 0 → moment when the tag was marked as expired (0 if never)
   * - 1 → moment when the tag was marked as stale (0 if never)
   *
   * These timestamps define whether a tag affects an entry based on
   * the entry's creation time. */
  _tags: Map<string, [number, number]>;
}
