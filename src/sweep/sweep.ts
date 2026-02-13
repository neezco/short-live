import { _instancesCache } from "../cache/create-cache";
import {
  MAX_KEYS_PER_BATCH,
  OPTIMAL_SWEEP_INTERVAL,
  OPTIMAL_SWEEP_TIME_BUDGET_IF_NOTE_METRICS_AVAILABLE,
} from "../defaults";
import type { CacheState } from "../types";
import { _metrics, _monitorInstance, startMonitor } from "../utils/start-monitor";

import { _batchUpdateExpiredRatio } from "./batchUpdateExpiredRatio";
import { calculateOptimalSweepParams } from "./calculate-optimal-sweep-params";
import { _selectInstanceToSweep } from "./select-instance-to-sweep";
import { _sweepOnce } from "./sweep-once";
import { _updateWeightSweep } from "./update-weight";

let _isSweepActive = false;
let _pendingSweepTimeout: NodeJS.Timeout | null = null;

export function startSweep(state: CacheState): void {
  if (_isSweepActive) return;
  _isSweepActive = true;
  startMonitor();
  void sweep(state); // schedule next sweep
}

export function stopSweep(): void {
  if (_pendingSweepTimeout) {
    clearTimeout(_pendingSweepTimeout);
    _pendingSweepTimeout = null;
  }
  _monitorInstance?.stop();
  _isSweepActive = false;
}

/**
 * Performs a sweep operation on the cache to remove expired and optionally stale entries.
 * Uses a linear scan with a saved pointer to resume from the last processed key.
 * @param state - The cache state.
 */
export const sweep = async (
  state: CacheState,

  /** @internal */
  utilities: SweepUtilities = {},
): Promise<void> => {
  const {
    schedule = defaultSchedule,
    yieldFn = defaultYieldFn,
    now = Date.now(),
    runOnlyOne = false,
  } = utilities;
  const startTime = now;

  let sweepIntervalMs = OPTIMAL_SWEEP_INTERVAL;
  let sweepTimeBudgetMs = OPTIMAL_SWEEP_TIME_BUDGET_IF_NOTE_METRICS_AVAILABLE;
  if (!__BROWSER__ && _metrics) {
    ({ sweepIntervalMs, sweepTimeBudgetMs } = calculateOptimalSweepParams({ metrics: _metrics }));
  }

  const totalSweepWeight = _updateWeightSweep();
  const currentExpiredRatios: number[][] = [];

  // Reduce the maximum number of keys per batch only when no instance weights are available
  // and the sweep is running in minimal round‑robin control mode. In this case, execute the
  // smallest possible sweep (equivalent to one batch, but divided across instances).
  const maxKeysPerBatch =
    totalSweepWeight <= 0 ? MAX_KEYS_PER_BATCH / _instancesCache.length : MAX_KEYS_PER_BATCH;

  let batchSweep = 0;
  while (true) {
    batchSweep += 1;

    const instanceToSweep = _selectInstanceToSweep({ batchSweep, totalSweepWeight });
    if (!instanceToSweep) {
      // No instance to sweep
      break;
    }

    const { ratio } = _sweepOnce(instanceToSweep, maxKeysPerBatch);
    // Initialize or update `currentExpiredRatios` array for current ratios
    (currentExpiredRatios[instanceToSweep._instanceIndexState] ??= []).push(ratio);

    if (Date.now() - startTime > sweepTimeBudgetMs) {
      break;
    }

    await yieldFn();
  }

  _batchUpdateExpiredRatio(currentExpiredRatios);

  // Schedule next sweep
  if (!runOnlyOne) {
    schedule(() => void sweep(state, utilities), sweepIntervalMs);
  }
};

// Default utilities for scheduling and yielding --------------------------------
const defaultSchedule: scheduleType = (fn, ms) => {
  _pendingSweepTimeout = setTimeout(fn, ms);
  if (typeof _pendingSweepTimeout.unref === "function") _pendingSweepTimeout.unref();
};
export const defaultYieldFn: yieldFnType = () => new Promise(resolve => setImmediate(resolve));

// Types for internal utilities -----------------------------------------------
type scheduleType = (fn: () => void, ms: number) => void;
type yieldFnType = () => Promise<void>;
interface SweepUtilities {
  /**
   *  Default scheduling function using setTimeout.
   *  This can be overridden for testing.
   *  @internal
   */
  schedule?: scheduleType;

  /**
   *  Default yielding function using setImmediate.
   *  This can be overridden for testing.
   *  @internal
   */
  yieldFn?: yieldFnType;

  /** Current timestamp for testing purposes. */
  now?: number;

  /**
   * If true, only run one sweep cycle.
   * @internal
   */
  runOnlyOne?: boolean;
}
