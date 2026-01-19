import { performance, type EventLoopUtilization } from "perf_hooks";

/**
 * Creates a performance monitor that periodically samples memory usage,
 * CPU usage, and event loop utilization for the current Node.js process.
 *
 * The monitor runs on a configurable interval and optionally invokes a
 * callback with the collected metrics on each cycle. It also exposes
 * methods to start and stop monitoring, retrieve the latest metrics,
 * and update configuration dynamically.
 *
 * @param options Configuration options for the monitor, including sampling
 * interval, maximum thresholds for normalization, and an optional callback.
 * @returns An API object that allows controlling the monitor lifecycle.
 */
export function createMonitorObserver(options: CreateMonitorObserverOptions): ReturnCreateMonitor {
  let intervalId: NodeJS.Timeout | null = null;

  let lastMetrics: PerformanceMetrics | null = null;
  let prevCpu = process.cpuUsage();
  let prevHrtime = process.hrtime.bigint();
  let prevLoop = performance.eventLoopUtilization();
  let lastCollectedAt = Date.now();

  const config = {
    intervalMs: options.intervalMs ?? 500,
    maxMemory: options.maxMemory,
    maxLoop: options.maxLoop,
  };

  function start(): void {
    if (intervalId) return; // ya está corriendo

    intervalId = setInterval(() => {
      try {
        const now = Date.now();

        const metrics = collectMetrics({
          prevCpu,
          prevHrtime,
          prevLoop,
          maxMemory: config.maxMemory,
          maxLoop: config.maxLoop,
          collectedAtMs: now,
          previousCollectedAtMs: lastCollectedAt,
          intervalMs: config.intervalMs,
        });

        lastMetrics = metrics;
        options.callback?.(metrics);

        prevCpu = metrics.cpu;
        prevHrtime = process.hrtime.bigint();
        prevLoop = metrics.loop;
        lastCollectedAt = now;
      } catch (e: unknown) {
        console.error("MonitorObserver: Not available", e);
        stop();
      }
    }, config.intervalMs);
  }

  function stop(): void {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function getMetrics(): PerformanceMetrics | null {
    if (lastMetrics) {
      // Update the current timestamp when metrics are requested
      return {
        ...lastMetrics,
        collectedAt: Date.now(),
      };
    }
    return null;
  }

  function updateConfig(newConfig: Partial<CreateMonitorObserverOptions>): void {
    if (newConfig.maxMemory !== undefined) config.maxMemory = newConfig.maxMemory;
    if (newConfig.maxLoop !== undefined) config.maxLoop = newConfig.maxLoop;
    if (newConfig.intervalMs !== undefined) {
      config.intervalMs = newConfig.intervalMs;

      // reiniciar si está activo
      if (intervalId) {
        stop();
        start();
      }
    }
  }

  return {
    start,
    stop,
    getMetrics,
    updateConfig,
  };
}

/**
 * Collects and normalizes performance metrics for the current process,
 * including memory usage, CPU usage, and event loop utilization.
 *
 * CPU and event loop metrics are computed as deltas relative to previously
 * recorded values. All metrics are normalized into a ratio between 0 and 1
 * based on the configured maximum thresholds.
 *
 * @param props Previous metric snapshots and normalization limits.
 * @returns A structured object containing normalized performance metrics.
 */
export function collectMetrics(props: {
  prevCpu: NodeJS.CpuUsage;
  prevHrtime: bigint;
  prevLoop: EventLoopUtilization;
  maxMemory: number;
  maxLoop: number;
  collectedAtMs: number;
  previousCollectedAtMs: number;
  intervalMs: number;
}): PerformanceMetrics {
  const nowHrtime = process.hrtime.bigint();

  const mem = process.memoryUsage();
  const memRatio = Math.min(1, mem.rss / props.maxMemory);

  const cpuDelta = process.cpuUsage(props.prevCpu);
  const elapsedNs = Number(nowHrtime - props.prevHrtime);
  const elapsedMs = elapsedNs / 1e6;
  const cpuMs = (cpuDelta.system + cpuDelta.user) / 1000;
  const cpuRatio = Math.min(1, cpuMs / elapsedMs);

  const loop = performance.eventLoopUtilization(props.prevLoop);

  const loopRatio = Math.min(1, loop.utilization / props.maxLoop);

  const actualElapsedMs = props.collectedAtMs - props.previousCollectedAtMs;

  return {
    memory: { ...mem, ratio: memRatio },
    cpu: { ...cpuDelta, ratio: cpuRatio },
    loop: { ...loop, ratio: loopRatio },
    collectedAt: props.collectedAtMs,
    previousCollectedAt: props.previousCollectedAtMs,
    intervalMs: props.intervalMs,
    actualElapsedMs,
  };
}

// -----------------------------------------------------------------

/**
 * Represents a metric extended with a normalized ratio between 0 and 1.
 *
 * The ratio indicates how close the metric is to its configured maximum
 * threshold, where 0 means minimal usage and 1 means the limit has been reached.
 *
 * @typeParam T The underlying metric type being normalized.
 */
export type NormalizedMetric<T> = T & {
  /** Normalized value between 0 and 1 */
  ratio: number;
};

/**
 * Represents the complete set of performance metrics collected by the monitor.
 *
 * Includes normalized values for memory usage, CPU usage, and event loop
 * utilization, each containing both raw data and a computed ratio.
 * Also includes timing information to track collection intervals.
 */
export interface PerformanceMetrics {
  /** Process memory usage, normalized */
  memory: NormalizedMetric<NodeJS.MemoryUsage>;

  /** Process CPU usage, normalized */
  cpu: NormalizedMetric<NodeJS.CpuUsage>;

  /** Event loop utilization, normalized */
  loop: NormalizedMetric<EventLoopUtilization>;

  /** Timestamp in milliseconds when this metric was collected */
  collectedAt: number;

  /** Timestamp in milliseconds of the previous metric collection */
  previousCollectedAt: number;

  /** Interval in milliseconds at which the monitor is running */
  intervalMs: number;

  /** Actual elapsed time in milliseconds since the last collection */
  actualElapsedMs: number;
}

/**
 * Configuration options for creating a performance monitor observer.
 *
 * These options define the sampling interval, maximum thresholds used for
 * normalization, and an optional callback invoked on each metric update.
 */
export interface CreateMonitorObserverOptions {
  /** Interval in milliseconds between each sample
   * @default 500
   */
  intervalMs: number;

  /** Maximum RSS memory limit allowed before the ratio reaches 1 */
  maxMemory: number;

  /** Maximum event loop utilization limit before the ratio reaches 1 */
  maxLoop: number;

  /** Optional callback that receives the metrics at each interval */
  callback?: (metrics: PerformanceMetrics) => void;
}

/**
 * Public API returned by `createMonitorObserver`.
 *
 * Provides methods to start and stop monitoring, retrieve the latest metrics,
 * and update the monitor configuration at runtime.
 */
interface ReturnCreateMonitor {
  /** Stops the monitoring interval */
  stop: () => void;

  /** Starts the monitoring interval */
  start: () => void;

  /** Returns the last collected metrics or null if none have been collected yet */
  getMetrics: () => PerformanceMetrics | null;

  /** Allows updating the monitor configuration on the fly */
  updateConfig: (newConfig: Partial<CreateMonitorObserverOptions>) => void;
}
