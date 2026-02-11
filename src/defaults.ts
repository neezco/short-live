// Time Unit Constants
// Base temporal units used throughout the caching system.
const ONE_SECOND: number = 1000;
const ONE_MINUTE: number = 60 * ONE_SECOND;

/**
 * ===================================================================
 * Cache Entry Lifecycle
 * Default TTL and stale window settings for short-lived cache entries.
 * ===================================================================
 */

/**
 * Default Time-To-Live in milliseconds for cache entries.
 * @default 1_800_000 (30 minutes)
 */
export const DEFAULT_TTL: number = 30 * ONE_MINUTE;

/**
 * Default stale window in milliseconds after expiration.
 * Allows serving slightly outdated data while fetching fresh data.
 */
export const DEFAULT_STALE_WINDOW: number = 0 as const;

/**
 * Maximum number of entries the cache can hold.
 * Beyond this limit, new entries are ignored.
 */
export const DEFAULT_MAX_SIZE: number = Infinity;

/**
 * Default maximum memory size in MB the cache can use.
 * Beyond this limit, new entries are ignored.
 * @default Infinite (unlimited)
 */
export const DEFAULT_MAX_MEMORY_SIZE: number = Infinity;

/**
 * ===================================================================
 * Sweep & Cleanup Operations
 * Parameters controlling how and when expired entries are removed.
 * ===================================================================
 */

/**
 * Maximum number of keys to process in a single sweep batch.
 * Higher values = more aggressive cleanup, lower latency overhead.
 */
export const MAX_KEYS_PER_BATCH: number = 1000;

/**
 * Minimal expired ratio enforced during sweeps.
 * Ensures control sweeps run above {@link EXPIRED_RATIO_MEMORY_THRESHOLD}.
 */
export const MINIMAL_EXPIRED_RATIO: number = 0.05;

/**
 * Memory usage threshold (normalized 0–1) triggering control sweeps.
 * At or above this level, sweeping becomes more aggressive.
 */
export const EXPIRED_RATIO_MEMORY_THRESHOLD: number = 0.8;

/**
 * Maximum allowed expired ratio when memory usage is low.
 * Upper bound for interpolation with MINIMAL_EXPIRED_RATIO.
 * Recommended range: `0.3 – 0.5` .
 */
export const DEFAULT_MAX_EXPIRED_RATIO: number = 0.4;

/**
 * ===================================================================
 * Sweep Intervals & Timing
 * Frequency and time budgets for cleanup operations.
 * ===================================================================
 */

/**
 * Optimal interval in milliseconds between sweeps.
 * Used when system load is minimal and metrics are available.
 */
export const OPTIMAL_SWEEP_INTERVAL: number = 2 * ONE_SECOND;

/**
 * Worst-case interval in milliseconds between sweeps.
 * Used when system load is high or metrics unavailable.
 */
export const WORST_SWEEP_INTERVAL: number = 200;

/**
 * Maximum time budget in milliseconds for sweep operations.
 * Prevents sweeping from consuming excessive CPU during high load.
 */
export const WORST_SWEEP_TIME_BUDGET: number = 40;

/**
 * Optimal time budget in milliseconds for each sweep cycle.
 * Used when performance metrics are not available or unreliable.
 */
export const OPTIMAL_SWEEP_TIME_BUDGET_IF_NOTE_METRICS_AVAILABLE: number = 15;

/**
 * ===================================================================
 * Memory Management
 * Process limits and memory-safe thresholds.
 * ===================================================================
 */

/**
 * Default maximum process memory limit in megabytes.
 * Acts as fallback when environment detection is unavailable.
 * NOTE: Overridable via environment detection at runtime.
 */
export const DEFAULT_MAX_PROCESS_MEMORY_MB: number = 1024;

/**
 * ===================================================================
 * System Utilization Weights
 * Balance how memory, CPU, and event-loop pressure influence sweep behavior.
 * Sum of all weights: 10 + 8.5 + 6.5 = 25
 * ===================================================================
 */

/**
 * Weight applied to memory utilization in sweep calculations.
 * Higher weight = memory pressure has more influence on sweep aggressiveness.
 */
export const DEFAULT_MEMORY_WEIGHT: number = 10;

/**
 * Weight applied to CPU utilization in sweep calculations.
 * Combined with event-loop weight to balance CPU-related pressure.
 */
export const DEFAULT_CPU_WEIGHT: number = 8.5;

/**
 * Weight applied to event-loop utilization in sweep calculations.
 * Complements CPU weight to assess overall processing capacity.
 */
export const DEFAULT_LOOP_WEIGHT: number = 6.5;

/**
 * ===================================================================
 * Stale Entry Purging
 * Thresholds and metric selection for stale entry cleanup strategy.
 * ===================================================================
 */

/**
 * Default metric used for resource‑based stale purging
 * when both size and memory limits are available.
 */
export const DEFAULT_PURGE_RESOURCE_METRIC: "higher" = "higher" as const;

/**
 * Fallback behavior for stale purging on GET
 * when no resource limits are defined.
 *
 * In this scenario, threshold-based purging is disabled,
 * so GET operations do NOT purge stale entries.
 */
export const DEFAULT_PURGE_STALE_ON_GET_NO_LIMITS: boolean = false;

/**
 * Fallback behavior for stale purging on SWEEP
 * when no resource limits are defined.
 *
 * In this scenario, threshold-based purging is disabled,
 * so SWEEP operations DO purge stale entries to prevent buildup.
 */
export const DEFAULT_PURGE_STALE_ON_SWEEP_NO_LIMITS: boolean = true;

/**
 * Default threshold for purging stale entries on get operations (backend with limits).
 * Stale entries are purged when resource usage exceeds 80%.
 *
 * Note: This is used when limits are configured.
 * When no limits are defined, purgeStaleOnGet defaults to false.
 */
export const DEFAULT_PURGE_STALE_ON_GET_THRESHOLD: number = 0.8;

/**
 * Default threshold for purging stale entries during sweep operations (backend with limits).
 * Stale entries are purged when resource usage exceeds 50%.
 *
 * Note: This is used when limits are configured.
 * When no limits are defined, purgeStaleOnSweep defaults to true.
 */
export const DEFAULT_PURGE_STALE_ON_SWEEP_THRESHOLD: number = 0.5;
