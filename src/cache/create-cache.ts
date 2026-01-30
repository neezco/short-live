import { DEFAULT_MAX_EXPIRED_RATIO } from "../defaults";
import { sweep } from "../sweep/sweep";
import type { CacheOptions, CacheState } from "../types";
import { startMonitor } from "../utils/start-monitor";

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

let _initSweepScheduled = false;

/**
 * Creates the initial state for the TTL cache.
 * @param options - Configuration options for the cache.
 * @returns The initial cache state.
 */
export const createCache = (options: CacheOptions = {}): CacheState => {
  const {
    onExpire,
    onDelete,
    defaultTtl = 1000 * 60 * 5, // 5 minutes
    maxSize = 100_000,
    _maxAllowExpiredRatio = DEFAULT_MAX_EXPIRED_RATIO,
    defaultStaleTtl = 0,
    purgeStaleOnGet = false,
    purgeStaleOnSweep = false,
    _autoStartSweep = true,
  } = options;

  _instanceCount++;

  // NEXT: warn if internal parameters are touch by user

  if (_instanceCount > INSTANCE_WARNING_THRESHOLD) {
    // NEXT: Use a proper logging mechanism
    // NEXT: Create documentation for this
    console.warn(
      `Too many instances detected (${_instanceCount}). This may indicate a configuration issue; consider minimizing instance creation or grouping keys by expected expiration ranges. See the documentation: https://github.com/neezco/short-live/docs/instances`,
    );
  }

  const state: CacheState = {
    store: new Map(),
    _sweepIter: null,
    get size() {
      return state.store.size;
    },
    onExpire,
    onDelete,
    maxSize,
    defaultTtl,
    defaultStaleTtl,
    purgeStaleOnGet,
    purgeStaleOnSweep,
    _maxAllowExpiredRatio,
    _autoStartSweep,
    _instanceIndexState: -1,
    _expiredRatio: 0,
    _sweepWeight: 0,
  };

  state._instanceIndexState = _instancesCache.push(state) - 1;

  // Start the sweep process
  if (_autoStartSweep) {
    if (_initSweepScheduled) return state;
    _initSweepScheduled = true;
    void sweep(state);
  }

  startMonitor();

  return state;
};
