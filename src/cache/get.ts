import type { CacheState } from "../types";

import { DELETE_REASON, deleteKey } from "./delete";
import { isFresh, isStale } from "./validators";

/**
 * Retrieves a value from the cache if the entry is valid.
 * @param state - The cache state.
 * @param key - The key to retrieve.
 * @param now - Optional timestamp override (defaults to Date.now()).
 * @returns The cached value if valid, null otherwise.
 */
export const get = (state: CacheState, key: string, now: number = Date.now()): unknown => {
  const entry = state.store.get(key);

  if (!entry) return null;

  if (isFresh(entry, now)) return entry.v;

  if (isStale(entry, now)) {
    if (state.purgeStaleOnGet) {
      deleteKey(state, key, DELETE_REASON.EXPIRED);
    }
    return entry.v;
  }

  // If it expired, always delete it
  deleteKey(state, key, DELETE_REASON.EXPIRED);

  return null;
};
