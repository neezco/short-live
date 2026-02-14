import { ENTRY_STATUS, type CacheEntry, type CacheState } from "../types";
import { _statusFromTags } from "../utils/status-from-tags";

/**
 * Computes the final derived status of a cache entry by combining:
 *
 * - The entry's own expiration timestamps (TTL and stale TTL).
 * - Any stricter expiration or stale rules imposed by its associated tags.
 *
 * Precedence rules:
 * - `EXPIRED` overrides everything.
 * - `STALE` overrides `FRESH`.
 * - If neither the entry nor its tags impose stricter rules, the entry is `FRESH`.
 *
 * @param state - The cache state containing tag metadata.
 * @param entry - The cache entry being evaluated.
 * @returns The final {@link ENTRY_STATUS} for the entry.
 */
export function computeEntryStatus(
  state: CacheState,
  entry: CacheEntry,

  /** @internal */
  now: number,
): ENTRY_STATUS {
  const [__createdAt, expiresAt, staleExpiresAt] = entry[0];

  // 1. Status derived from tags
  const [tagStatus, earliestTagStaleInvalidation] = _statusFromTags(state, entry);
  if (tagStatus === ENTRY_STATUS.EXPIRED) return ENTRY_STATUS.EXPIRED;
  const windowStale = staleExpiresAt - expiresAt;
  if (
    tagStatus === ENTRY_STATUS.STALE &&
    staleExpiresAt > 0 &&
    now < earliestTagStaleInvalidation + windowStale &&
    now <= staleExpiresAt
  ) {
    // A tag can mark the entry as stale only if the entry itself supports a stale window.
    // The tag's stale invalidation time is extended by the entry's stale window duration.
    // If "now" is still within that extended window, the entry is considered stale.
    return ENTRY_STATUS.STALE;
  }

  // 2. Status derived from entry timestamps
  if (now < expiresAt) {
    return ENTRY_STATUS.FRESH;
  }
  if (staleExpiresAt > 0 && now < staleExpiresAt) {
    return ENTRY_STATUS.STALE;
  }

  return ENTRY_STATUS.EXPIRED;
}

// ---------------------------------------------------------------------------
// Entry status wrappers (semantic helpers built on top of computeEntryStatus)
// ---------------------------------------------------------------------------
/**
 * Determines whether a cache entry is fresh.
 *
 * A fresh entry is one whose final derived status is `FRESH`, meaning:
 * - It has not expired according to its own timestamps, and
 * - No associated tag imposes a stricter stale or expired rule.
 *
 * `entry` can be either a {@link CacheEntry} or a pre-computed {@link ENTRY_STATUS}.
 * Passing a pre-computed status avoids recalculating the entry status.
 *
 * @param state - The cache state containing tag metadata.
 * @param entry - The cache entry or pre-computed status being evaluated.
 * @param now - The current timestamp.
 * @returns True if the entry is fresh.
 */
export const isFresh = (
  state: CacheState,
  entry: CacheEntry | ENTRY_STATUS,
  now: number,
): boolean => {
  if (typeof entry === "string") {
    // If entry is already a pre-computed status (from tags), it's fresh only if that status is FRESH.
    return entry === ENTRY_STATUS.FRESH;
  }

  return computeEntryStatus(state, entry, now) === ENTRY_STATUS.FRESH;
};
/**
 * Determines whether a cache entry is stale.
 *
 * A stale entry is one whose final derived status is `STALE`, meaning:
 * - It has passed its TTL but is still within its stale window, or
 * - A tag imposes a stale rule that applies to this entry.
 *
 * `entry` can be either a {@link CacheEntry} or a pre-computed {@link ENTRY_STATUS}.
 * Passing a pre-computed status avoids recalculating the entry status.
 *
 * @param state - The cache state containing tag metadata.
 * @param entry - The cache entry or pre-computed status being evaluated.
 * @param now - The current timestamp.
 * @returns True if the entry is stale.
 */
export const isStale = (
  state: CacheState,
  entry: CacheEntry | ENTRY_STATUS,

  /** @internal */
  now: number,
): boolean => {
  if (typeof entry === "string") {
    // If entry is already a pre-computed status (from tags), it's stale only if that status is STALE.
    return entry === ENTRY_STATUS.STALE;
  }

  return computeEntryStatus(state, entry, now) === ENTRY_STATUS.STALE;
};

/**
 * Determines whether a cache entry is expired.
 *
 * An expired entry is one whose final derived status is `EXPIRED`, meaning:
 * - It has exceeded both its TTL and stale TTL, or
 * - A tag imposes an expiration rule that applies to this entry.
 *
 * `entry` can be either a {@link CacheEntry} or a pre-computed {@link ENTRY_STATUS}.
 * Passing a pre-computed status avoids recalculating the entry status.
 *
 * @param state - The cache state containing tag metadata.
 * @param entry - The cache entry or pre-computed status being evaluated.
 * @param now - The current timestamp.
 * @returns True if the entry is expired.
 */
export const isExpired = (
  state: CacheState,
  entry: CacheEntry | ENTRY_STATUS,

  /** @internal */
  now: number,
): boolean => {
  if (typeof entry === "string") {
    // If entry is already a pre-computed status (from tags), it's expired only if that status is EXPIRED.
    return entry === ENTRY_STATUS.EXPIRED;
  }

  return computeEntryStatus(state, entry, now) === ENTRY_STATUS.EXPIRED;
};

/**
 * Determines whether a cache entry is valid.
 *
 * A valid entry is one whose final derived status is either:
 * - `FRESH`, or
 * - `STALE` (still within its stale window).
 *
 * Expired entries are considered invalid.
 *
 * `entry` can be either a {@link CacheEntry} or a pre-computed {@link ENTRY_STATUS},
 * or undefined/null if the entry was not found. Passing a pre-computed status avoids
 * recalculating the entry status.
 *
 * @param state - The cache state containing tag metadata.
 * @param entry - The cache entry, pre-computed status, or undefined/null if not found.
 * @param now - The current timestamp (defaults to {@link Date.now}).
 * @returns True if the entry exists and is fresh or stale.
 */
export const isValid = (
  state: CacheState,
  entry?: CacheEntry | ENTRY_STATUS | null,

  /** @internal */
  now: number = Date.now(),
): boolean => {
  if (!entry) return false;
  if (typeof entry === "string") {
    // If entry is already a pre-computed status (from tags), it's valid if it's FRESH or STALE.
    return entry === ENTRY_STATUS.FRESH || entry === ENTRY_STATUS.STALE;
  }

  const status = computeEntryStatus(state, entry, now);
  return status === ENTRY_STATUS.FRESH || status === ENTRY_STATUS.STALE;
};
