/**
 * Public API type definitions for LocalTtlCache.
 *
 * This file re-exports the public types from types.ts,
 * providing a clear interface for external consumers
 * while keeping internal types separate.
 */

export type {
  /** Configuration options for cache initialization. */
  CacheOptions,
  /** Entry metadata returned with includeMetadata: true. */
  EntryMetadata,
  /** Options for tag invalidation. */
  InvalidateTagOptions,
  /** Purge mode: boolean or 0-1 threshold. */
  PurgeMode,
  /** Entry status enum. */
  ENTRY_STATUS,
} from "./types";

export type {
  /** Options for get() without metadata. */
  GetOptionsWithoutMetadata,
  /** Options for get() with metadata. */
  GetOptionsWithMetadata,
  /** Options for set() method. */
  SetOptions,
} from "./types";

export type {
  /** Public cache interface. */
  LocalTtlCacheInterface,
} from "./types";
