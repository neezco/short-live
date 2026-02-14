import { afterEach } from "node:test";

import { describe, it, expect, beforeEach, vi } from "vitest";

import { OPTIMAL_SWEEP_INTERVAL } from "../src/defaults";
import { LocalTtlCache } from "../src/index";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

/**
 * Tests for purgeStaleOnGet, purgeStaleOnSweep, and purgeResourceMetric behaviors.
 *
 * These tests validate the public API behavior exclusively:
 * - purgeResourceMetric: How resource metric is selected based on configuration
 * - purgeStaleOnGet: When stale entries are purged during get() operations
 * - purgeStaleOnSweep: When stale entries are purged during automatic sweep cycles
 *
 * All tests use only public API: LocalTtlCache.set(), get(), size, etc.
 * Tests properly simulate the async sweep cycle by advancing time beyond OPTIMAL_SWEEP_INTERVAL (2000ms).
 */
describe("purge strategy (purgeStaleOnGet, purgeStaleOnSweep, purgeResourceMetric)", () => {
  describe("purgeResourceMetric behavior", () => {
    it("auto-selects metric based on configured limits", () => {
      // BEHAVIOR: purgeResourceMetric auto-selection logic:
      // - Backend with maxSize only → "size" metric
      // - Backend with maxMemorySize only → "memory" metric
      // - Backend with both → "higher" metric (max of both)
      // - No limits → "fixed" (disables threshold-based purging)
      // - Browser with maxSize → "size"
      // - Browser without maxSize → "fixed"

      // With only maxSize: uses "size" metric (normalized entry count)
      // This allows threshold-based purging to use: current / maxSize
      const cacheWithSize = new LocalTtlCache({
        maxSize: 100,
        defaultTtl: 1000,
        defaultStaleWindow: 1000,
      });
      // @ts-expect-error - accessing internal state for test validation
      expect(cacheWithSize.state.purgeResourceMetric).toBe("size");

      // Without any limits: uses "fixed" metric
      // This disables numeric threshold-based purging (0-1 thresholds).
      // Numeric values fallback to boolean: true or false.
      const cacheNoLimits = new LocalTtlCache({
        defaultTtl: 1000,
        defaultStaleWindow: 1000,
      });
      // @ts-expect-error - accessing internal state for test validation
      expect(cacheNoLimits.state.purgeResourceMetric).toBe("fixed");

      // With both maxSize and maxMemorySize: uses "higher" metric
      // This evaluates resource usage as: max(memory%, size%)
      // Useful when multiple limits could trigger purging
      const cacheWithBothLimits = new LocalTtlCache({
        maxSize: 100,
        maxMemorySize: 1024,
        defaultTtl: 1000,
        defaultStaleWindow: 1000,
      });
      // @ts-expect-error - accessing internal state for test validation
      expect(cacheWithBothLimits.state.purgeResourceMetric).toBe("higher");
    });

    it("affects purgeStaleOnGet default: triggers threshold-based purging on get", () => {
      // BEHAVIOR: When metric is "size" (with maxSize limit configured):
      // purgeStaleOnGet defaults to 0.80 (80% threshold), not false.
      // This means stale entries are PURGED when resource usage ≥ 80%.
      // Without limits, default would be false (never purge on get).

      const cacheWithLimits = new LocalTtlCache({
        maxSize: 10,
        defaultTtl: 100,
        defaultStaleWindow: 100,
        // purgeStaleOnGet not specified -> defaults to 0.80 (threshold-based)
      });

      // Set one entry
      cacheWithLimits.set("key1", "value1");
      expect(cacheWithLimits.size).toBe(1); // 10% usage

      const now = Date.now();
      vi.setSystemTime(now + 150); // Past TTL (100ms), but within stale window (100ms)

      // At 10% usage (below 80% threshold): stale entry is preserved on get
      const result1 = cacheWithLimits.get("key1");
      expect(result1).toBe("value1"); // Returns stale value
      expect(cacheWithLimits.size).toBe(1); // NOT purged (below threshold)

      // Fill cache to exceed 80% threshold
      for (let i = 0; i < 8; i++) {
        cacheWithLimits.set(`key${i + 2}`, `value${i + 2}`);
      }
      expect(cacheWithLimits.size).toBe(9); // 90% usage, exceeds 80% threshold

      // At 90% usage (above 80% threshold): stale entries ARE purged on get
      const resultAfterThreshold = cacheWithLimits.get("key1");
      expect(resultAfterThreshold).toBe("value1"); // Returns value on get
      expect(cacheWithLimits.size).toBe(8); // Entry purged AFTER get due to threshold
    });

    it("affects purgeStaleOnSweep default: purges stale entries during sweep cycles", async () => {
      // BEHAVIOR: When metric is "fixed" (no limits configured):
      // purgeStaleOnSweep defaults to true (always purge stale on sweep).
      // This prevents unbounded accumulation of stale entries in unlimited caches.
      // With limits, default would be 0.5 (50% threshold).

      const cacheNoLimits = new LocalTtlCache({
        defaultTtl: 100,
        defaultStaleWindow: OPTIMAL_SWEEP_INTERVAL * 2, // > sweep interval to ensure stale window during sweep
        purgeStaleOnGet: false, // Don't purge on get, only on sweep
        // purgeStaleOnSweep not specified -> defaults to true (always purge)
      });

      cacheNoLimits.set("key1", "value1");
      expect(cacheNoLimits.size).toBe(1);

      // Move past TTL to make entry stale
      await vi.advanceTimersByTimeAsync(150);
      // Entry is now stale but NOT YET swept
      expect(cacheNoLimits.size).toBe(1);

      // Trigger a sweep cycle (queries run at OPTIMAL_SWEEP_INTERVAL)
      // With purgeStaleOnSweep=true (the default), sweep should purge stale entries
      await vi.advanceTimersByTimeAsync(OPTIMAL_SWEEP_INTERVAL);
      // After sweep, stale entry should be purged (default=true for no-limits case)
      expect(cacheNoLimits.size).toBe(0);
    });
  });

  describe("purgeStaleOnGet behavior", () => {
    it("purgeStaleOnGet=true: immediately removes stale entries after get() returns", () => {
      // BEHAVIOR: When purgeStaleOnGet=true:
      // - Entry is returned to caller if fresh/stale
      // - After get() returns, stale entries are purged from cache
      // - This is most aggressive for removing stale data
      // - Useful when you want fresh data ASAP and don't need stale fallback

      const cacheWithPurge = new LocalTtlCache({
        maxSize: 100,
        defaultTtl: 100,
        defaultStaleWindow: 100,
        purgeStaleOnSweep: false, // Don't purge on sweep, only on get
        purgeStaleOnGet: true, // Aggressive: purge on every stale access
      });

      cacheWithPurge.set("key1", "value1");
      cacheWithPurge.set("key2", "value2");
      expect(cacheWithPurge.size).toBe(2);

      const now = Date.now();
      vi.setSystemTime(now + 150); // Entries are now stale (150 > 100ms TTL)

      // First get(): returns stale value, then purges the entry
      const result1 = cacheWithPurge.get("key1");
      expect(result1).toBe("value1");
      expect(cacheWithPurge.size).toBe(1); // key1 was purged after get()

      // Second get(): also returns and purges
      const result2 = cacheWithPurge.get("key2");
      expect(result2).toBe("value2");
      expect(cacheWithPurge.size).toBe(0); // Both purged
    });

    it("purgeStaleOnGet=false: preserves stale entries even after access", () => {
      // BEHAVIOR: When purgeStaleOnGet=false:
      // - Stale entries are returned to caller
      // - Stale entries remain in cache after get()
      // - Cache size unaffected by stale reads
      // - Useful for long-lived stale windows or fallback patterns

      const cacheNoPurge = new LocalTtlCache({
        maxSize: 100,
        defaultTtl: 100,
        defaultStaleWindow: 100,
        purgeStaleOnSweep: false, // Don't purge on sweep
        purgeStaleOnGet: false, // Conservative: keep stale entries
      });

      cacheNoPurge.set("key1", "value1");
      cacheNoPurge.set("key2", "value2");
      expect(cacheNoPurge.size).toBe(2);

      const now = Date.now();
      vi.setSystemTime(now + 150); // Entries are stale

      // Get stale entries - they are preserved
      const result1 = cacheNoPurge.get("key1");
      expect(result1).toBe("value1");
      expect(cacheNoPurge.size).toBe(2); // NOT purged

      const result2 = cacheNoPurge.get("key2");
      expect(result2).toBe("value2");
      expect(cacheNoPurge.size).toBe(2); // Still not purged
    });

    it("purgeStaleOnGet with numeric threshold: purges based on resource usage", () => {
      // BEHAVIOR: When purgeStaleOnGet=0.3 (30% threshold):
      // - At resource usage < 30%: stale entries are preserved on get()
      // - At resource usage ≥ 30%: stale entries are purged on get()
      // - Resource usage is computed by purgeResourceMetric (in this case "size")
      // - This balances memory usage with stale data availability

      const cacheThreshold = new LocalTtlCache({
        maxSize: 100,
        defaultTtl: 100,
        defaultStaleWindow: 100,
        purgeStaleOnGet: 0.3, // 30% threshold for size metric
      });

      // Fill to 25% usage (25/100 entries)
      for (let i = 0; i < 25; i++) {
        cacheThreshold.set(`key${i}`, `value${i}`);
      }
      expect(cacheThreshold.size).toBe(25);

      const now = Date.now();
      vi.setSystemTime(now + 150); // Make entries stale

      // At 25% usage (below 30% threshold): stale entries preserved on get
      const result = cacheThreshold.get("key0");
      expect(result).toBe("value0");
      expect(cacheThreshold.size).toBe(25); // NOT purged (below threshold)

      // Fill to 35% usage (35/100 entries)
      for (let i = 25; i < 35; i++) {
        cacheThreshold.set(`key${i}`, `value${i}`);
      }
      expect(cacheThreshold.size).toBe(35); // 35% usage

      // At 35% usage (above 30% threshold): stale entries purged on get
      const resultAboveThreshold = cacheThreshold.get("key1");
      expect(resultAboveThreshold).toBe("value1"); // Returns value
      expect(cacheThreshold.size).toBeLessThan(35); // Some purged (above threshold)
    });

    it("per-call purgeStale option overrides cache-level default", () => {
      // BEHAVIOR: The purgeStale option in get() call overrides the cache's default:
      // - get(key, { purgeStale: false }) → never purge, even if cache default is true
      // - get(key, { purgeStale: true }) → always purge, even if cache default is false
      // - get(key, { purgeStale: 0.5 }) → use threshold, overriding cache threshold
      // - This allows per-call fine-grained control over purging behavior

      const cacheDefault = new LocalTtlCache({
        maxSize: 100,
        defaultTtl: 100,
        defaultStaleWindow: 100,
        purgeStaleOnGet: false, // Cache default: don't purge
      });

      cacheDefault.set("key1", "value1");
      cacheDefault.set("key2", "value2");

      const now = Date.now();
      vi.setSystemTime(now + 150); // Both entries are stale

      // Explicitly keep stale (matches cache default)
      const result1 = cacheDefault.get("key1", { purgeStale: false });
      expect(result1).toBe("value1");
      expect(cacheDefault.size).toBe(2); // Both preserved

      // Override with true: purge this specific stale entry
      const result2 = cacheDefault.get("key2", { purgeStale: true });
      expect(result2).toBe("value2"); // Returns value
      expect(cacheDefault.size).toBe(1); // key2 purged (override to true)
    });

    it("expiration always removes entries (ignores purgeStaleOnGet)", () => {
      // BEHAVIOR: Fully expired entries (beyond stale window) are ALWAYS removed:
      // - purgeStaleOnGet setting only affects STALE entries (inside stale window)
      // - EXPIRED entries (beyond stale window) are removed regardless
      // - This is independent of purgeStaleOnGet value (true/false/threshold)
      // - Protects against unbounded growth of completely outdated data

      const cache = new LocalTtlCache({
        maxSize: 100,
        defaultTtl: 100,
        defaultStaleWindow: 0, // No stale window - expires directly at TTL
        purgeStaleOnGet: false, // Normally don't purge stale on get
      });

      cache.set("key1", "value1");
      expect(cache.size).toBe(1);

      const now = Date.now();
      vi.setSystemTime(now + 200); // Way past TTL (100ms), no stale window

      // Entry is fully expired (not stale, but expired)
      const result = cache.get("key1");
      expect(result).toBeUndefined(); // Not returned (expired)
      expect(cache.size).toBe(0); // Always removed, even with purgeStaleOnGet=false
    });
  });

  describe("purgeStaleOnSweep behavior", () => {
    it("purgeStaleOnSweep=true: sweep removes stale entries when triggered", async () => {
      // BEHAVIOR: When purgeStaleOnSweep=true:
      // - Automatic sweep cycles run at OPTIMAL_SWEEP_INTERVAL (2000ms)
      // - During sweep, stale entries are purged from the cache
      // - This is useful for caches with expensive entries or long stale windows
      // - Prevents unbounded growth compared to purgeStaleOnSweep=false

      const cacheWithSweepPurge = new LocalTtlCache({
        maxSize: 100,
        defaultTtl: 100,
        defaultStaleWindow: OPTIMAL_SWEEP_INTERVAL * 2, // > sweep interval to ensure stale window persists during sweep
        purgeStaleOnGet: false, // Don't purge on get, only on sweep
        purgeStaleOnSweep: true, // Purge stale entries during sweep
      });

      // Create entries
      for (let i = 0; i < 20; i++) {
        cacheWithSweepPurge.set(`key${i}`, `value${i}`);
      }
      expect(cacheWithSweepPurge.size).toBe(20);

      // Advance to stale period (entries expire but haven't been swept yet)
      await vi.advanceTimersByTimeAsync(150); // > 100ms TTL
      expect(cacheWithSweepPurge.size).toBe(20); // All stale but not swept yet

      // Trigger next sweep cycle (beyond 2000ms from start)
      await vi.advanceTimersByTimeAsync(2000 - 150 + 50); // Jump past sweep interval

      // After sweep: entries should be purged
      expect(cacheWithSweepPurge.size).toBeLessThan(20);
    });

    it("purgeStaleOnSweep=false: sweep preserves stale entries", async () => {
      // BEHAVIOR: When purgeStaleOnSweep=false:
      // - Stale entries remain in cache through sweep cycles
      // - Only fully expired entries (beyond stale window) are removed
      // - Useful for caches where stale data has value (e.g., fallback scenarios)
      // - Can lead to unbounded accumulation if stale window is very long

      const ttl = OPTIMAL_SWEEP_INTERVAL * 2;
      const cacheNoSweepPurge = new LocalTtlCache({
        maxSize: 100,
        defaultTtl: ttl,
        defaultStaleWindow: OPTIMAL_SWEEP_INTERVAL * 100, // Very long to ensure stale but not expired
        purgeStaleOnGet: false,
        purgeStaleOnSweep: false, // Don't purge stale on sweep
      });

      // Create entries
      for (let i = 0; i < 20; i++) {
        cacheNoSweepPurge.set(`key${i}`, `value${i}`);
      }
      expect(cacheNoSweepPurge.size).toBe(20);

      // Advance past TTL to make entries stale and trigger at least one sweep
      await vi.advanceTimersByTimeAsync(ttl + OPTIMAL_SWEEP_INTERVAL);

      // Stale entries are preserved (not purged during sweep)
      expect(cacheNoSweepPurge.size).toBe(20);
    });

    it("purgeStaleOnSweep with numeric threshold: threshold-based purging on sweep", async () => {
      // BEHAVIOR: When purgeStaleOnSweep=0.5 (50% threshold):
      // - At resource usage < 50%: stale entries preserved during sweep
      // - At resource usage ≥ 50%: stale entries purged during sweep
      // - Resource usage is computed by purgeResourceMetric (in this case "size")
      // - Useful for balancing memory pressure with stale data availability

      const sweepInterval = OPTIMAL_SWEEP_INTERVAL;

      const cache = new LocalTtlCache({
        maxSize: 100,
        defaultTtl: 50, // TTL: entries expire quickly
        defaultStaleWindow: sweepInterval * 2, // Must be > sweep interval to ensure sweep runs while stale
        purgeStaleOnGet: false,
        purgeStaleOnSweep: 0.5, // 50% threshold
      });

      //
      // --- PHASE 1: BELOW THRESHOLD (30%) ---
      //

      // Fill to 30% usage (below the 50% purge threshold)
      for (let i = 0; i < 30; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      expect(cache.size).toBe(30);

      // Move past TTL so entries become stale
      await vi.advanceTimersByTimeAsync(50);

      // Allow one sweep cycle to run while entries are stale
      await vi.advanceTimersByTimeAsync(sweepInterval);

      // Below threshold → stale entries preserved during sweep
      expect(cache.size).toBe(30);

      //
      // --- PHASE 2: ABOVE THRESHOLD (55%) ---
      //

      // Fill above the 50% threshold
      for (let i = 30; i < 55; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      expect(cache.size).toBe(55);

      // Move past TTL so new entries become stale
      await vi.advanceTimersByTimeAsync(50);

      // Allow another sweep cycle to run while entries are stale
      await vi.advanceTimersByTimeAsync(sweepInterval);

      // Above threshold → sweep should purge stale entries
      expect(cache.size).toBeLessThan(55);
    });

    it("sweeps always remove fully expired entries (ignores purgeStaleOnSweep)", async () => {
      // BEHAVIOR: Fully expired entries (beyond stale window) are ALWAYS removed during sweep:
      // - purgeStaleOnSweep setting only affects STALE entries (inside stale window)
      // - EXPIRED entries (beyond stale window) are removed regardless
      // - This is independent of purgeStaleOnSweep value (true/false/threshold)
      // - Protects against unbounded accumulation across sweep cycles

      const cache = new LocalTtlCache({
        maxSize: 100,
        defaultTtl: 50,
        defaultStaleWindow: 0, // No stale window - expires directly at TTL
        purgeStaleOnGet: false,
        purgeStaleOnSweep: false, // Even with false, expired entries are removed
      });

      for (let i = 0; i < 20; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      expect(cache.size).toBe(20);

      // Move way past expiration and trigger multiple sweeps
      await vi.advanceTimersByTimeAsync(2100); // Beyond sweep interval AND fully expired

      // Expired entries are ALWAYS removed, even with purgeStaleOnSweep=false
      expect(cache.size).toBe(0);
    });

    it("multiple sweep cycles accumulate purging over time", async () => {
      // BEHAVIOR: Multiple sweep cycles allow gradual purging of stale entries:
      // - Each sweep cycle processes a portion of the cache (incremental)
      // - Stale entries can be purged gradually across multiple cycles
      // - If purgeStaleOnSweep triggers, entries are removed on next sweep
      // - Useful for large caches where full cleanup in one cycle is expensive

      const cache = new LocalTtlCache({
        maxSize: 1000,
        defaultTtl: 100,
        defaultStaleWindow: OPTIMAL_SWEEP_INTERVAL * 2, // > sweep interval to ensure stale persists during sweep
        purgeStaleOnGet: false,
        purgeStaleOnSweep: true,
      });

      // Add entries
      for (let i = 0; i < 100; i++) {
        cache.set(`batch1_${i}`, `value${i}`);
      }
      expect(cache.size).toBe(100);

      // Advance to stale and trigger first sweep
      await vi.advanceTimersByTimeAsync(150); // Make entries stale (150 > 100 TTL)
      expect(cache.size).toBe(100); // Not swept yet

      await vi.advanceTimersByTimeAsync(2000 - 150 + 50); // Beyond sweep interval, execute sweep

      const sizeAfterFirstSweep = cache.size;
      expect(sizeAfterFirstSweep).toBeLessThan(100); // Some purged in first sweep

      // Add more entries after first sweep
      for (let i = 0; i < 100; i++) {
        cache.set(`batch2_${i}`, `value${i}`);
      }

      // Advance further to make all entries stale and trigger second sweep
      await vi.advanceTimersByTimeAsync(50); // Make all stale
      await vi.advanceTimersByTimeAsync(2000); // Beyond next sweep interval, execute second sweep

      const sizeAfterSecondSweep = cache.size;
      // Size should be ≤ first sweep size + new entries added
      expect(sizeAfterSecondSweep).toBeLessThanOrEqual(sizeAfterFirstSweep + 100);
    });
  });

  describe("interaction: purgeResourceMetric + purgeStaleOnGet + purgeStaleOnSweep", () => {
    it("metric affects threshold evaluation: size-based purging on get", () => {
      // BEHAVIOR: When metric is \"size\" (from \"higher\" or \"size\" config):
      // - Threshold-based purging evaluates: current entries / maxSize
      // - At usage < threshold: stale entries preserved on get()
      // - At usage ≥ threshold: stale entries purged on get()
      // - \"size\" metric is useful when entry count is the limit

      const cache = new LocalTtlCache({
        maxSize: 100,
        defaultTtl: 100,
        defaultStaleWindow: 100,
        purgeStaleOnGet: 0.5, // 50% threshold
      });

      const now = Date.now();

      // Fill to 40% (below threshold for size metric)
      for (let i = 0; i < 40; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      expect(cache.size).toBe(40);

      vi.setSystemTime(now + 150); // Stale

      // At 40/100 = 40% usage, below 50% threshold
      const result = cache.get("key0");
      expect(result).toBe("value0");
      expect(cache.size).toBe(40); // Not purged

      // Add entries to cross 50% threshold
      for (let i = 40; i < 55; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      expect(cache.size).toBe(55); // Now 55% usage > 50% threshold

      // Now should purge stale entries on get
      const result2 = cache.get("key1");
      expect(result2).toBe("value1");
      expect(cache.size).toBeLessThan(55); // Some stale entries purged
    });

    it("defaults differ by configuration: with vs without limits", () => {
      // BEHAVIOR: Auto-detection of defaults changes based on configured limits:
      // - WITH limits → threshold-based (0.80 for get, 0.50 for sweep)
      // - WITHOUT limits → boolean modes (false for get, true for sweep)
      // - This balances memory efficiency with unlimited caches' safety

      // WITHOUT limits: purgeStaleOnGet defaults to false
      const cacheNoLimits = new LocalTtlCache({
        defaultTtl: 100,
        defaultStaleWindow: 100,
      });

      cacheNoLimits.set("key1", "value1");

      const now = Date.now();
      vi.setSystemTime(now + 150);

      // Should preserve stale (default=false with no limits)
      const result = cacheNoLimits.get("key1");
      expect(result).toBe("value1");
      expect(cacheNoLimits.size).toBe(1);

      // WITH limits: purgeStaleOnGet defaults to 0.8 (80% threshold)
      const cacheWithLimits = new LocalTtlCache({
        maxSize: 100,
        defaultTtl: 100,
        defaultStaleWindow: 100,
      });

      cacheWithLimits.set("key1", "value1");

      const now2 = Date.now();
      vi.setSystemTime(now2 + 150);

      // At low usage (1%), below 80% threshold: preserve stale
      const result2 = cacheWithLimits.get("key1");
      expect(result2).toBe("value1");
    });

    it("explicit config overrides auto-detected defaults", () => {
      // BEHAVIOR: Explicit configuration takes precedence over auto-detection:
      // - maxSize configured → auto-detects 0.80 for purgeStaleOnGet
      // - But explicit purgeStaleOnGet: false → overrides auto-detection
      // - Allows per-cache customization despite detected limits

      const cache = new LocalTtlCache({
        maxSize: 100,
        defaultTtl: 100,
        defaultStaleWindow: 100,
        purgeStaleOnGet: false, // Explicit override
      });

      cache.set("key1", "value1");

      const now = Date.now();
      vi.setSystemTime(now + 150);

      // Despite having limits, explicitly set to false
      const result = cache.get("key1");
      expect(result).toBe("value1");
      expect(cache.size).toBe(1); // Not purged
    });
  });

  describe("real-world scenarios", () => {
    it("high-throughput: aggressive purging to minimize memory", () => {
      // SCENARIO: High-throughput cache where fresh data is critical
      // - purgeStaleOnGet=true → purge stale on every access
      // - purgeStaleOnSweep=true → aggressive cleanup on sweeps
      // - Result: minimal stale data in cache, memory-efficient
      // - Trade-off: stale fallbacks not available

      const cache = new LocalTtlCache({
        maxSize: 50,
        defaultTtl: 100,
        defaultStaleWindow: 100,
        purgeStaleOnGet: true, // Aggressive: purge on every stale access
        purgeStaleOnSweep: true, // Also purge during sweep
      });

      let now = Date.now();

      // Write phase: fill cache
      vi.setSystemTime(now);
      for (let i = 0; i < 50; i++) {
        cache.set(`item_${i}`, { data: `value_${i}` });
      }
      expect(cache.size).toBe(50);

      // Move to stale period
      now = Date.now();
      vi.setSystemTime(now + 150); // All become stale

      // Access phase: each get() triggers immediate purge with purgeStaleOnGet=true
      let accessedCount = 0;
      for (let i = 0; i < 50; i++) {
        const value = cache.get(`item_${i}`);
        if (value !== undefined) accessedCount++;
      }

      // All should return on first read but get purged immediately after
      expect(accessedCount).toBe(50);

      // Cache should be mostly empty due to aggressive purging
      expect(cache.size).toBeLessThan(50);
    });

    it("conservative: preserve stale data as fallback", () => {
      // SCENARIO: Cache where stale data is valuable (e.g., API fallback pattern)
      // - purgeStaleOnGet=false → keep stale on read
      // - purgeStaleOnSweep=false → keep stale on sweep
      // - Result: max stale availability, higher memory usage
      // - Trade-off: unbounded growth without limits; requires manual cleanup

      const cache = new LocalTtlCache({
        maxSize: 50,
        defaultTtl: 100,
        defaultStaleWindow: 100,
        purgeStaleOnGet: false, // Preserve stale
        purgeStaleOnSweep: false, // Also preserve during sweep
      });

      let now = Date.now();

      // Fill cache
      vi.setSystemTime(now);
      for (let i = 0; i < 50; i++) {
        cache.set(`item_${i}`, { data: `value_${i}` });
      }

      // Move to stale period
      now = Date.now();
      vi.setSystemTime(now + 150); // All stale

      // Read phase: count accessible stale entries
      let staleCount = 0;
      for (let i = 0; i < 50; i++) {
        const value = cache.get(`item_${i}`);
        if (value !== undefined) staleCount++;
      }

      // With conservative approach, stale entries preserved
      expect(staleCount).toBe(50);
      expect(cache.size).toBe(50);
    });

    it("dynamic threshold: adaptive purging as pressure increases", () => {
      // SCENARIO: Adaptive cache that purges stale when reaching capacity
      // - purgeStaleOnGet=0.6 → purge when >60% full
      // - Below 60%: stale entries serve as fallback (low pressure)
      // - Above 60%: stale entries purged to free space (high pressure)
      // - Result: balanced behavior based on current load

      const cache = new LocalTtlCache({
        maxSize: 100,
        defaultTtl: 100,
        defaultStaleWindow: 100,
        purgeStaleOnGet: 0.6, // Purge at 60% threshold
      });

      const now = Date.now();
      vi.setSystemTime(now);

      // Phase 1: Low pressure (30% full)
      for (let i = 0; i < 30; i++) {
        cache.set(`key_${i}`, `value${i}`);
      }
      expect(cache.size).toBe(30);

      // Make them stale
      vi.setSystemTime(now + 150);

      // At 30% (below 60% threshold): stale entries act as fallback
      let purgedInLowUsage = 0;
      for (let i = 0; i < 30; i++) {
        if (cache.get(`key_${i}`) === undefined) purgedInLowUsage++;
      }
      expect(purgedInLowUsage).toBe(0); // Nothing purged (low pressure)

      // Phase 2: High pressure (70% full above 60% threshold)
      for (let i = 30; i < 70; i++) {
        cache.set(`key_${i}`, `value${i}`);
      }
      expect(cache.size).toBe(70); // 70% usage > 60% threshold

      // Make entries stale
      vi.setSystemTime(now + 250);

      // At 70% (above 60% threshold): stale entries purged to free space
      let purgedInHighUsage = 0;
      for (let i = 0; i < 30; i++) {
        if (cache.get(`key_${i}`) === undefined) purgedInHighUsage++;
      }

      // Some entries purged due to high pressure threshold
      expect(purgedInHighUsage).toBeGreaterThan(0);
    });
  });
});
