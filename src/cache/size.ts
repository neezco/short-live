import type { CacheState } from "../types";

/**
 * Returns the number of entries in the cache.
 * @param state - The cache state.
 * @returns The number of entries.
 */
export const size = (state: CacheState): number => {
  return state.store.size;
};
