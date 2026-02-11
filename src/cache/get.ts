import type { CacheState } from "../types";

import { DELETE_REASON, deleteKey } from "./delete";
import { computeEntryStatus, isFresh, isStale } from "./validators";

/**
 * Retrieves a value from the cache if the entry is valid.
 * @param state - The cache state.
 * @param key - The key to retrieve.
 * @param now - Optional timestamp override (defaults to Date.now()).
 * @returns The cached value if valid, null otherwise.
 */
export const get = (state: CacheState, key: string, now: number = Date.now()): unknown => {
  const entry = state.store.get(key);

  if (!entry) return undefined;

  const status = computeEntryStatus(state, entry, now);

  if (isFresh(state, status, now)) return entry[1];

  if (isStale(state, status, now)) {
    if (state.purgeStaleOnGet) {
      deleteKey(state, key, DELETE_REASON.STALE);
    }
    return entry[1];
  }

  // If it expired, always delete it
  deleteKey(state, key, DELETE_REASON.EXPIRED);

  return undefined;
};
