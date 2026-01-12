import type { CacheState, CacheEntry } from "../types";

/**
 * Sets or updates a value in the cache with TTL and optional stale TTL.
 *
 * @param state - The cache state.
 * @param input - Cache entry definition (key, value, ttlMs, staleMs).
 * @param now - Optional timestamp override used as the base time (defaults to Date.now()).
 *
 * @returns void
 */
export const setOrUpdate = (
  state: CacheState,
  input: CacheSetOrUpdateInput,

  /** @internal */
  now: number = Date.now(),
): void => {
  const { key, value, ttlMs, staleTTLMs } = input;

  if (key == null) throw new Error("Missing key.");
  if (value == null) throw new Error("Missing value.");
  if (ttlMs == null) throw new Error("Missing ttlMs.");

  const ttl = ttlMs ?? state.defaultTTL;
  const staleTTL = staleTTLMs ?? state.defaultStaleTTL;

  if (!Number.isFinite(ttl)) {
    throw new Error("TTL must be a finite number.");
  }

  if (!Number.isFinite(staleTTL)) {
    throw new Error("staleTTL must be a finite number.");
  }

  const entry: CacheEntry = {
    v: value,
    e: now + ttl,
    se: staleTTL && staleTTL > 0 ? now + staleTTL : 0,
  };

  state.store.set(key, entry);
};

/**
 * Input parameters for setting or updating a cache entry.
 */
export interface CacheSetOrUpdateInput {
  /**
   * Key under which the value will be stored.
   */
  key: string;

  /**
   * Value to store in the cache.
   */
  value: unknown;

  /**
   * TTL (Time-To-Live) in milliseconds for this entry.
   */
  ttlMs: number;

  /**
   * Optional stale TTL in milliseconds for this entry.
   * When provided, the entry may be served as stale after TTL
   * but before stale TTL expires.
   */
  staleTTLMs?: number;
}
