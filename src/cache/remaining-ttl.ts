import type { CacheState } from "../types";

/**
 * Returns the remaining TTL (Time-To-Live) in milliseconds for a given key.
 * @param state - The cache state.
 * @param key - The key to check.
 * @param now - Optional timestamp override (defaults to Date.now()).
 * @returns The remaining TTL in milliseconds, or 0 if the key does not exist or has expired.
 */
export const remainingTTL = (
  state: CacheState,
  key: string,

  /** @internal */
  now: number = Date.now(),
): number => {
  const entry = state.store.get(key);
  if (!entry) return 0;
  return Math.max(0, entry.e - now);
};
