import type { DELETE_REASON } from "./cache/delete";

/**
 * Base configuration shared between CacheOptions and CacheState.
 */
export interface CacheConfigBase {
  /**
   * Callback invoked when an entry expires naturally (not manually deleted).
   * @param key - The expired key.
   * @param value - The value associated with the expired key.
   * @param reason - The reason for expiration: 'expired' (fully expired) or 'stale' (stale window expired).
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
   * Default stale window in milliseconds for entries without explicit `staleWindow`.
   *
   * Defines how long an entry can be served as stale after expiration.
   * The window is relative to each entry's expiration moment, whether from
   * explicit `ttl` or the cache's `defaultTtl`.
   *
   * @default 0 (no stale window)
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
   * Controls stale entry purging behavior on `get()` operations.
   *
   * - `true` → purge stale entries immediately after read.
   * - `false` → retain stale entries after read.
   * - `number (0-1)` → purge when `resourceUsage ≥ threshold` (uses `purgeResourceMetric`).
   *
   * Environment notes:
   * - Backend: `"memory"` and `"higher"` metrics available; frontend: only `"size"`.
   * - Can be overridden per-read via `get(key, { purgeStale })`.
   *
   * Defaults:
   * - With limits → `0.80` (80% resource usage).
   * - Without limits → `false`.
   */
  purgeStaleOnGet: PurgeMode;

  /**
   * Controls stale entry purging behavior during sweep operations.
   *
   * - `true` → purge stale entries during sweeps.
   * - `false` → retain stale entries during sweeps.
   * - `number (0-1)` → purge when `resourceUsage ≥ threshold` (uses `purgeResourceMetric`).
   *
   * Environment notes:
   * - Backend: `"memory"` and `"higher"` metrics available; frontend: only `"size"`.
   * - Prevents stale entry accumulation when enabled.
   *
   * Defaults:
   * - With limits → `0.5` (50% resource usage).
   * - Without limits → `true` (prevent accumulation).
   */
  purgeStaleOnSweep: PurgeMode;

  /**
   * Metric used to evaluate resource usage for threshold-based stale purging.
   *
   * Applies when `purgeStaleOnGet` or `purgeStaleOnSweep` are numeric (0-1).
   *
   * Metric options:
   * - `"size"` → normalized entry count (`current / maxSize`).
   * - `"memory"` → normalized RAM (`currentMB / maxMemorySize`).
   * - `"higher"` → max of both metrics (recommended for dual limits).
   * - `"fixed"` → disable threshold purging; only bool values apply.
   *
   * Environment support:
   * - Backend: all metrics available.
   * - Frontend: only `"size"`; numeric thresholds fallback to `"fixed"`.
   *
   * Auto-selection (if not specified):
   * - Backend: `"higher"` (both limits) → `"memory"` → `"size"` → `"fixed"`.
   * - Frontend: `"size"` (if valid) → `"fixed"`.
   *
   * @default Depends on environment and valid limits.
   */
  purgeResourceMetric?: "memory" | "size" | "higher" | "fixed";

  /**
   * Auto-start sweep process on cache initialization.
   *
   * @internal
   * @default true
   */
  _autoStartSweep: boolean;

  /**
   * @internal Maximum allowed ratio of expired entries before aggressive sweep.
   */
  _maxAllowExpiredRatio: number;
}

/**
 * Purge mode: boolean for immediate/skip, or 0-1 for threshold-based purging.
 */
export type PurgeMode = boolean | number;

/**
 * Public cache configuration (all fields optional).
 */
export type CacheOptions = Partial<CacheConfigBase>;

/**
 * Options for tag invalidation. Extensible for forward-compatibility.
 */
export interface InvalidateTagOptions {
  /**
   * If true, mark entries as stale instead of fully expired.
   * They remain accessible via stale window if configured.
   */
  asStale?: boolean;

  [key: string]: unknown;
}

/**
 * Cache entry lifecycle timestamps (tuple format).
 *
 * - [0] `createdAt` → Entry creation timestamp (absolute).
 * - [1] `expiresAt` → Expiration timestamp (absolute).
 * - [2] `staleExpiresAt` → Stale window expiration (absolute).
 */
export type EntryTimestamp = [
  /** Absolute timestamp when entry was created. */
  number,
  /** Absolute timestamp when entry expires. */
  number,
  /** Absolute timestamp when stale window expires. */
  number,
];

/**
 * Cache entry tuple structure: `[timestamps, value, tags]`.
 *
 * Tuple indices:
 * - [0] `EntryTimestamp` → Creation, expiration, and stale timestamps.
 * - [1] `value` → The cached data.
 * - [2] `tags` → Associated tags for group invalidation, or null.
 */
export type CacheEntry = [
  EntryTimestamp,
  /** Cached value (any type). */
  unknown,
  (
    /**
     * Tags for group invalidation and categorization.
     * Null if no tags are set.
     */
    string[] | null
  ),
];

/**
 * Entry status: fresh, stale, or expired.
 */
export enum ENTRY_STATUS {
  /** Valid and within TTL. */
  FRESH = "fresh",
  /** Expired but within stale window; still served. */
  STALE = "stale",
  /** Beyond stale window; not served. */
  EXPIRED = "expired",
}

/**
 * Metadata returned from `get()` with `includeMetadata: true`.
 * Provides complete entry state including timing, status, and tags.
 */
export interface EntryMetadata<T = unknown> {
  /** The cached value. */
  data: T;
  /** Absolute timestamp (ms) when entry expires. */
  expirationTime: number;
  /** Absolute timestamp (ms) when stale window ends. */
  staleWindowExpiration: number;
  /** Current entry status. */
  status: ENTRY_STATUS;
  /** Associated tags for group invalidation, or null. */
  tags: string[] | null;
}

/**
 * @internal Runtime state for cache instances.
 */
export interface CacheState extends CacheConfigBase {
  /** Key-value store for all entries. */
  store: Map<string, CacheEntry>;
  /** Current entry count. */
  size: number;
  /** Iterator for incremental sweep operations. */
  _sweepIter: IterableIterator<[string, CacheEntry]> | null;
  /** Instance index for multi-instance sweep scheduling. */
  _instanceIndexState: number;
  /** Average ratio of expired entries in this instance. */
  _expiredRatio: number;
  /** Relative weight for sweep operation priority. */
  _sweepWeight: number;
  /**
   * Tag invalidation timestamps.
   * Each tag maps to `[expiredAt, staleAt]` (0 = never set).
   * Used to determine if entries with this tag are invalidated.
   */
  _tags: Map<string, [number, number]>;
}

/**
 * Options for `get()` without metadata (default).
 * Returns only the cached value.
 */
export interface GetOptionsWithoutMetadata {
  /**
   * If false (or omitted), returns value only without metadata.
   * @default false
   */
  includeMetadata?: false;

  /**
   * Controls stale entry purging on this read.
   *
   * - `true` → purge immediately after return.
   * - `false` → keep stale entries.
   * - `number (0-1)` → purge at resource usage threshold.
   *
   * Overrides global `purgeStaleOnGet` setting.
   */
  purgeStale?: PurgeMode;
}

/**
 * Options for `get()` with metadata.
 * Returns value and complete entry state.
 */
export interface GetOptionsWithMetadata {
  /**
   * If true, returns `EntryMetadata<T>` object with value, timing, and tags.
   */
  includeMetadata: true;

  /**
   * Controls stale entry purging on this read.
   *
   * - `true` → purge immediately after return.
   * - `false` → keep stale entries.
   * - `number (0-1)` → purge at resource usage threshold.
   *
   * Overrides global `purgeStaleOnGet` setting.
   */
  purgeStale?: PurgeMode;
}

/**
 * Options for `set()` method.
 * Controls TTL, stale window, and tagging per entry.
 */
export interface SetOptions {
  /**
   * Time-To-Live in milliseconds.
   * Determines fresh period before expiration.
   *
   * Special values:
   * - `0` | `Infinity` → entry never expires
   *
   * Falls back to cache's `defaultTtl` if omitted.
   */
  ttl?: number;

  /**
   * Stale window duration in milliseconds.
   *
   * Determines how long entry serves stale after expiration.
   * Falls back to cache's `defaultStaleWindow` if omitted.
   */
  staleWindow?: number;

  /**
   * One or more tags for group-based invalidation.
   *
   * Tags enable batch invalidation via `invalidateTag()`.
   * Invalidating ANY tag on an entry invalidates the whole entry.
   *
   * Falls back to cache's default if omitted.
   */
  tags?: string | string[];
}

/**
 * TTL cache public interface.
 * Implemented by `LocalTtlCache` class.
 */
export interface LocalTtlCacheInterface {
  /**
   * Current number of entries (may include expired entries pending cleanup).
   */
  readonly size: number;

  /**
   * Retrieves value from cache.
   * Returns fresh, stale, or undefined (expired or not found).
   *
   * @overload `get<T>(key)` → `T | undefined` (no metadata)
   * @overload `get<T>(key, { includeMetadata: true })` → `EntryMetadata<T> | undefined` (with metadata)
   */
  get<T = unknown>(key: string): T | undefined;
  get<T = unknown>(key: string, options: GetOptionsWithMetadata): EntryMetadata<T> | undefined;
  get<T = unknown>(key: string, options: GetOptionsWithoutMetadata): T | undefined;

  /**
   * Sets or replaces a cache entry.
   * @returns true if set/updated, false if rejected (limits/invalid).
   */
  set(key: string, value: unknown, options?: SetOptions): boolean;

  /**
   * Deletes a specific key from cache.
   * @returns true if deleted, false if not found.
   */
  delete(key: string): boolean;

  /**
   * Checks if key exists (fresh or stale).
   * @returns true if valid, false if not found or fully expired.
   */
  has(key: string): boolean;

  /**
   * Removes all entries from cache.
   * Does NOT trigger `onDelete` callbacks (optimization).
   */
  clear(): void;

  /**
   * Marks entries with given tags as expired (or stale).
   * Invalidating ANY tag on an entry invalidates it.
   */
  invalidateTag(tags: string | string[], options?: InvalidateTagOptions): void;
}
