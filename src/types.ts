import type { DELETE_REASON } from "./cache/delete";

/**
 * Base configuration shared between CacheOptions and CacheState.
 */
export interface CacheConfigBase {
  /**
   * Callback invoked when a key expires naturally.
   * @param key - The expired key.
   * @param value - The value associated with the expired key.
   */
  onExpire?: (key: string, value: unknown) => void;

  /**
   * Callback invoked when a key is deleted, either manually or due to expiration.
   * @param key - The deleted key.
   * @param value - The value of the deleted key.
   * @param reason - The reason for deletion ('manual', 'expired', or 'stale').
   */
  onDelete?: (key: string, value: unknown, reason: DELETE_REASON) => void;

  /**
   * Default TTL (Time-To-Live) in milliseconds for entries without explicit TTL.
   * @default 300_000 (5 minutes)
   */
  defaultTTL: number;

  /**
   * Default stale TTL in milliseconds for entries without explicit stale TTL.
   */
  defaultStaleTTL: number;

  /**
   * Maximum number of entries the cache can hold.
   * @default 100_000
   */
  maxSize: number;

  /**
   * Maximum size of the cache in MB, based on process memory usage.
   * @internal
   * @deprecated The memory model in `browsers` differs significantly from `Node.js`, and the added complexity of hydration in browser APIs contributed to the deprecation of `maxSizeMB`
   * @default 512
   */
  maxSizeMB: number;

  /**
   * Interval in milliseconds between sweep operations to check for expired keys.
   * @default 250
   */
  sweepIntervalMs: number;

  /**
   * Number of keys to process in each batch before yielding to the event loop.
   *
   * This does NOT limit the total number of keys processed in a sweep.
   * As long as there is remaining sweepTimeBudgetMs, the sweeper will run
   * multiple batches, yielding after each one to avoid blocking the event loop.
   *
   * @default 500
   */
  keysPerBatch: number;

  /**
   * Ratio of expired keys to target during sweeps.
   * @internal
   * @deprecated Targeting a specific percentage of expired keys requires true random access to guarantee an accurate ratio. Achieving this with `Map` would force duplicating keys in an array and constantly compacting it, increasing algorithmic complexity and memory usage. Since this overhead hurts performance, `sweepExpiredRatio` was deprecated in favor of a faster linear scan.
   * @default 0.3
   */
  sweepExpiredRatio: number;

  /**
   * Maximum amount of time (in milliseconds) that a sweep cycle
   * is allowed to run.
   *
   * @default 30
   */
  sweepTimeBudgetMs: number;

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
   * @default true
   */
  autoStartSweep: boolean;
}

/**
 * Public configuration options for the TTL cache.
 */
export type CacheOptions = Partial<CacheConfigBase>;

/**
 * Represents a single cache entry.
 */
export interface CacheEntry {
  /** The stored value. */
  v: unknown;

  /** expiresAt: Absolute timestamp when the entry becomes invalid (Date.now() + TTL). */
  e: number;

  /** staleExpiresAt: Absolute timestamp when the entry stops being stale (Date.now() + staleTTL). */
  se?: number;
}

/**
 * Internal state of the TTL cache.
 */
export interface CacheState extends CacheConfigBase {
  /** Map storing key-value entries. */
  store: Map<string, CacheEntry>;

  /** Current memory size in MB.
   * @internal
   * @deprecated The memory model in `browsers` differs significantly from `Node.js`, and the added complexity of hydration in browser APIs contributed to the deprecation of `currentSize`
   */
  currentSize: number;

  /** Whether process.memoryUsage is available.
   * @internal
   * @deprecated The memory model in `browsers` differs significantly from `Node.js`, and the added complexity of hydration in browser APIs contributed to the deprecation of `processMemory`
   */
  processMemory: boolean;

  /** Iterator for sweeping keys. */
  _sweepIter: MapIterator<[string, CacheEntry]> | null;
}
