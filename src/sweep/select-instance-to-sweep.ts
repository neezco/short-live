import { _instancesCache } from "../cache/create-cache";
import type { CacheState } from "../types";

/**
 * Selects a cache instance to sweep based on sweep weights or round‑robin order.
 *
 * Two selection modes are supported:
 * - **Round‑robin mode**: If `totalSweepWeight` ≤ 0, instances are selected
 *   deterministically in sequence using `batchSweep`. Once all instances
 *   have been processed, returns `null`.
 * - **Weighted mode**: If sweep weights are available, performs a probabilistic
 *   selection. Each instance’s `_sweepWeight` contributes proportionally to its
 *   chance of being chosen.
 *
 * This function depends on `_updateWeightSweep` to maintain accurate sweep weights.
 *
 * @param totalSweepWeight - Sum of all sweep weights across instances.
 * @param batchSweep - Current batch index used for round‑robin selection.
 * @returns The selected `CacheState` instance, `null` if no instance remains,
 * or `undefined` if the cache is empty.
 */
export function _selectInstanceToSweep({
  totalSweepWeight,
  batchSweep,
}: {
  totalSweepWeight: number;
  batchSweep: number;
}): CacheState | null | undefined {
  // Default selection: initialize with the first instance in the cache list.
  // This acts as a fallback in case no weighted selection occurs.
  let instanceToSweep: CacheState | null | undefined = _instancesCache[0];

  if (totalSweepWeight <= 0) {
    // Case 1: No sweep weight assigned (all instances skipped or empty).
    // → Perform a deterministic round‑robin minimal sweep across all instances.
    // Each batch iteration selects the next instance in order.
    if (batchSweep > _instancesCache.length) {
      // If all instances have been processed in this cycle, no instance to sweep.
      instanceToSweep = null;
    }
    instanceToSweep = _instancesCache[batchSweep - 1] as CacheState;
  } else {
    // Case 2: Sweep weights are available.
    // → Perform a probabilistic selection based on relative sweep weights.
    // A random threshold is drawn in [0, totalSweepWeight].
    let threshold = Math.random() * totalSweepWeight;

    // Iterate through instances, subtracting each instance’s weight.
    // The first instance that reduces the threshold to ≤ 0 is selected.
    // This ensures that instances with higher weights have proportionally
    // higher probability of being chosen for sweeping.
    for (const inst of _instancesCache) {
      threshold -= inst._sweepWeight;
      if (threshold <= 0) {
        instanceToSweep = inst;
        break;
      }
    }
  }

  return instanceToSweep;
}
