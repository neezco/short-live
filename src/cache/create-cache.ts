import {
  DEFAULT_MAX_EXPIRED_RATIO,
  DEFAULT_MAX_MEMORY_SIZE,
  DEFAULT_MAX_SIZE,
  DEFAULT_STALE_WINDOW,
  DEFAULT_TTL,
} from "../defaults";
import { startSweep } from "../sweep/sweep";
import type { CacheOptions, CacheState } from "../types";

import {
  resolvePurgeResourceMetric,
  resolvePurgeStaleOnGet,
  resolvePurgeStaleOnSweep,
} from "./resolve-purge-config";

let _instanceCount = 0;
const INSTANCE_WARNING_THRESHOLD = 99;
export const _instancesCache: CacheState[] = [];

/**
 * Resets the instance count for testing purposes.
 * This function is intended for use in tests to avoid instance limits.
 */
export const _resetInstanceCount = (): void => {
  _instanceCount = 0;
};

/**
 * Creates the initial state for the TTL cache.
 * @param options - Configuration options for the cache.
 * @returns The initial cache state.
 */
export const createCache = (options: CacheOptions = {}): CacheState => {
  const {
    onExpire,
    onDelete,
    defaultTtl = DEFAULT_TTL,
    maxSize = DEFAULT_MAX_SIZE,
    maxMemorySize = DEFAULT_MAX_MEMORY_SIZE,
    _maxAllowExpiredRatio = DEFAULT_MAX_EXPIRED_RATIO,
    defaultStaleWindow = DEFAULT_STALE_WINDOW,
    purgeStaleOnGet,
    purgeStaleOnSweep,
    purgeResourceMetric,
    _autoStartSweep = true,
  } = options;

  _instanceCount++;

  // NEXT: warn if internal parameters are touch by user

  if (_instanceCount > INSTANCE_WARNING_THRESHOLD) {
    // NEXT: Use a proper logging mechanism
    // NEXT: Create documentation for this
    console.warn(
      `Too many instances detected (${_instanceCount}). This may indicate a configuration issue; consider minimizing instance creation or grouping keys by expected expiration ranges. See the documentation: https://github.com/neezco/cache/docs/getting-started.md`,
    );
  }

  const resolvedPurgeResourceMetric =
    purgeResourceMetric ?? resolvePurgeResourceMetric(maxSize, maxMemorySize);

  const resolvedPurgeStaleOnGet = resolvePurgeStaleOnGet(
    maxSize,
    maxMemorySize,
    resolvedPurgeResourceMetric,
    purgeStaleOnGet,
  );
  const resolvedPurgeStaleOnSweep = resolvePurgeStaleOnSweep(
    maxSize,
    maxMemorySize,
    resolvedPurgeResourceMetric,
    purgeStaleOnSweep,
  );

  const state: CacheState = {
    store: new Map(),
    _sweepIter: null,
    get size() {
      return state.store.size;
    },
    onExpire,
    onDelete,
    maxSize,
    maxMemorySize,
    defaultTtl,
    defaultStaleWindow,
    purgeStaleOnGet: resolvedPurgeStaleOnGet,
    purgeStaleOnSweep: resolvedPurgeStaleOnSweep,
    purgeResourceMetric: resolvedPurgeResourceMetric,
    _maxAllowExpiredRatio,
    _autoStartSweep,
    _instanceIndexState: -1,
    _expiredRatio: 0,
    _sweepWeight: 0,
    _tags: new Map(),
  };

  state._instanceIndexState = _instancesCache.push(state) - 1;

  startSweep(state);

  return state;
};
