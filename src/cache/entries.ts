import type { CacheState, CacheEntry } from "../types";

/**
 * Returns an iterator over the cache entries.
 * @param state - The cache state.
 * @returns An iterator of [key, CacheEntry] pairs.
 */
export const entries = (state: CacheState): MapIterator<[string, CacheEntry]> => {
  return state.store.entries();
};
