import { _instancesCache } from "../cache/create-cache";

/**
 * Updates the expired ratio for each cache instance based on the collected ratios.
 * @param currentExpiredRatios - An array of arrays containing expired ratios for each cache instance.
 * @internal
 */
export function _batchUpdateExpiredRatio(currentExpiredRatios: number[][]): void {
  for (const inst of _instancesCache) {
    const ratios = currentExpiredRatios[inst._instanceIndexState];
    if (ratios && ratios.length > 0) {
      const avgRatio = ratios.reduce((sum, val) => sum + val, 0) / ratios.length;

      const alpha = 0.6; // NOTE: this must be alway higher than 0.5 to prioritize recent avgRatio
      inst._expiredRatio = inst._expiredRatio * (1 - alpha) + avgRatio * alpha;
    }
  }
}
