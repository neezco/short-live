import type { CacheState } from "../types";

import { get } from "./get";

/**
 * Checks if a key exists in the cache and is not expired.
 * @param state - The cache state.
 * @param key - The key to check.
 * @param now - Optional timestamp override (defaults to Date.now()).
 * @returns True if the key exists and is valid, false otherwise.
 */
export const has = (state: CacheState, key: string, now: number = Date.now()): boolean => {
  return get(state, key, now) !== undefined;
};
