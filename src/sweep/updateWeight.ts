import { _instancesCache } from "../cache/create-cache";

export function _updateWeightSweep(): number {
  let totalSweepWeight = 0;

  for (const instCache of _instancesCache) {
    if (instCache.store.size <= 0) {
      instCache._sweepWeight = 0;
      continue;
    }

    // NOTE: It is assumed that there is always at least 5% expired keys to ensure that a periodic control sweep can be executed
    const MINIMAL_EXPIRED_RATIO = 0.05;
    let expiredRatio = MINIMAL_EXPIRED_RATIO;
    if (instCache._expiredRatio > expiredRatio) {
      expiredRatio = instCache._expiredRatio;
    }

    instCache._sweepWeight = instCache.store.size * expiredRatio;
    totalSweepWeight += instCache._sweepWeight;
  }

  return totalSweepWeight;
}
