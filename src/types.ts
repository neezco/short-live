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
  defaultTtl: number;

  /**
   * Default stale TTL in milliseconds for entries without explicit stale TTL.
   */
  defaultStaleTtl: number;

  /**
   * Maximum number of entries the cache can hold.
   * @default 100_000
   */
  maxSize: number;

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
 * Represents a single cache entry.
 */
export interface CacheEntry {
  /** The stored value. */
  v: unknown;

  /** expiresAt: Absolute timestamp when the entry becomes invalid (Date.now() + TTL). */
  e: number;

  /** staleExpiresAt: Absolute timestamp when the entry stops being stale (Date.now() + staleTTL). */
  se: number;
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
}
