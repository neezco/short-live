import { performance, type EventLoopUtilization } from "perf_hooks";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createMonitorObserver, collectMetrics } from "../src/utils/procces-monitor";
import type {
  PerformanceMetrics,
  CreateMonitorObserverOptions,
} from "../src/utils/procces-monitor";

// Constants for test configuration
const DEFAULT_CONFIG: CreateMonitorObserverOptions = {
  intervalMs: 100,
  maxMemory: 1024 * 1024 * 1024, // 1GB
  maxLoop: 1,
};

const HALF_GB = 512 * 1024 * 1024;

/**
 * Creates a monitor with default or custom config and ensures cleanup.
 * Automatically stops the monitor when done.
 */
function createTestMonitor(config?: Partial<CreateMonitorObserverOptions>) {
  const monitor = createMonitorObserver({ ...DEFAULT_CONFIG, ...config });
  return monitor;
}

/**
 * Asserts that metrics have all required properties and correct types.
 */
function assertMetricsStructure(metrics: PerformanceMetrics | null) {
  expect(metrics).not.toBeNull();
  expect(metrics).toHaveProperty("memory");
  expect(metrics).toHaveProperty("cpu");
  expect(metrics).toHaveProperty("loop");
  expect(metrics).toHaveProperty("collectedAt");
  expect(metrics).toHaveProperty("previousCollectedAt");
  expect(metrics).toHaveProperty("intervalMs");
  expect(metrics).toHaveProperty("actualElapsedMs");

  expect(typeof metrics?.collectedAt).toBe("number");
  expect(typeof metrics?.previousCollectedAt).toBe("number");
  expect(typeof metrics?.intervalMs).toBe("number");
  expect(typeof metrics?.actualElapsedMs).toBe("number");
}

/**
 * Asserts that a metric ratio is properly normalized between 0 and 1.
 */
function assertNormalizedRatio(value: number | undefined) {
  expect(value).toBeDefined();
  expect(typeof value).toBe("number");
  expect(value).toBeGreaterThanOrEqual(0);
  expect(value).toBeLessThanOrEqual(1);
}

describe("createMonitorObserver", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return null for metrics before any collection", () => {
    const monitor = createTestMonitor();
    expect(monitor.getMetrics()).toBeNull();
    monitor.stop();
  });

  it("should start monitoring and collect metrics", () => {
    const monitor = createTestMonitor();

    monitor.start();
    expect(monitor.getMetrics()).toBeNull();

    vi.advanceTimersByTime(150);

    assertMetricsStructure(monitor.getMetrics());

    monitor.stop();
  });

  it("should stop monitoring and not collect new metrics", () => {
    const monitor = createTestMonitor();

    monitor.start();
    vi.advanceTimersByTime(150);
    const metricsWhileRunning = monitor.getMetrics();

    monitor.stop();
    const metricsAfterStop = monitor.getMetrics();

    // Core metrics should be preserved (except collectedAt which updates on getMetrics)
    expect(metricsAfterStop?.memory).toEqual(metricsWhileRunning?.memory);
    expect(metricsAfterStop?.cpu).toEqual(metricsWhileRunning?.cpu);
    expect(metricsAfterStop?.loop).toEqual(metricsWhileRunning?.loop);
    expect(metricsAfterStop?.previousCollectedAt).toEqual(metricsWhileRunning?.previousCollectedAt);
    expect(metricsAfterStop?.actualElapsedMs).toEqual(metricsWhileRunning?.actualElapsedMs);

    vi.advanceTimersByTime(200);

    // After stop, metrics should remain consistent
    const metricsAfterTime = monitor.getMetrics();
    expect(metricsAfterTime?.memory).toEqual(metricsAfterStop?.memory);
    expect(metricsAfterTime?.cpu).toEqual(metricsAfterStop?.cpu);
    expect(metricsAfterTime?.loop).toEqual(metricsAfterStop?.loop);

    monitor.stop();
  });

  it("should invoke callback with metrics on each interval", () => {
    const callback = vi.fn();
    const monitor = createTestMonitor({ callback });

    monitor.start();
    vi.advanceTimersByTime(120);
    expect(callback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(120);
    expect(callback).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(120);
    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenCalledWith(expect.any(Object));

    monitor.stop();
  });

  it("should update max memory configuration", () => {
    const monitor = createTestMonitor();

    monitor.start();
    vi.advanceTimersByTime(150);

    const initialRatio = monitor.getMetrics()?.memory.ratio ?? 0;
    assertNormalizedRatio(initialRatio);

    monitor.updateConfig({ maxMemory: HALF_GB });
    vi.advanceTimersByTime(150);

    const updatedRatio = monitor.getMetrics()?.memory.ratio ?? 0;
    expect(updatedRatio).toBeGreaterThanOrEqual(initialRatio);

    monitor.stop();
  });

  it("should update max loop configuration", () => {
    const monitor = createTestMonitor();

    monitor.start();
    vi.advanceTimersByTime(150);

    const initialRatio = monitor.getMetrics()?.loop.ratio ?? 0;
    assertNormalizedRatio(initialRatio);

    monitor.updateConfig({ maxLoop: 0.5 });
    vi.advanceTimersByTime(150);

    const updatedRatio = monitor.getMetrics()?.loop.ratio ?? 0;
    expect(updatedRatio).toBeGreaterThanOrEqual(initialRatio);

    monitor.stop();
  });

  it("should handle multiple config updates", () => {
    const monitor = createTestMonitor();

    monitor.start();
    vi.advanceTimersByTime(150);

    const initialMetrics = monitor.getMetrics();
    expect(initialMetrics).not.toBeNull();

    monitor.updateConfig({
      intervalMs: 200,
      maxMemory: HALF_GB,
      maxLoop: 0.8,
    });

    vi.advanceTimersByTime(250);

    const updatedMetrics = monitor.getMetrics();
    expect(updatedMetrics).not.toBeNull();

    monitor.stop();
  });

  it("should track timing information in metrics", () => {
    const monitor = createTestMonitor();

    monitor.start();
    vi.advanceTimersByTime(120);

    const metrics = monitor.getMetrics();
    expect(metrics?.intervalMs).toBe(100);
    expect(metrics?.collectedAt).toBeDefined();
    expect(metrics?.previousCollectedAt).toBeDefined();
    expect(metrics?.actualElapsedMs).toBeGreaterThan(0);

    monitor.stop();
  });

  it("should track timing information across multiple collections", () => {
    const collectedMetrics: PerformanceMetrics[] = [];
    const monitor = createTestMonitor({
      callback: m => collectedMetrics.push(m),
    });

    monitor.start();

    vi.advanceTimersByTime(120);
    expect(collectedMetrics).toHaveLength(1);
    expect(collectedMetrics[0]?.actualElapsedMs).toBeGreaterThan(0);

    vi.advanceTimersByTime(120);
    expect(collectedMetrics).toHaveLength(2);

    // Verify timestamps reflect progression
    expect(collectedMetrics[1]!.collectedAt).toBeGreaterThan(collectedMetrics[0]!.collectedAt);
    expect(collectedMetrics[1]!.previousCollectedAt).toBe(collectedMetrics[0]!.collectedAt);
    expect(collectedMetrics[1]!.actualElapsedMs).toBeGreaterThan(0);

    monitor.stop();
  });

  it("should update intervalMs in metrics when config changes", () => {
    const collectedMetrics: PerformanceMetrics[] = [];
    const monitor = createTestMonitor({
      callback: m => collectedMetrics.push(m),
    });

    monitor.start();
    vi.advanceTimersByTime(120);
    expect(collectedMetrics[0]?.intervalMs).toBe(100);

    monitor.updateConfig({ intervalMs: 200 });
    vi.advanceTimersByTime(250);
    expect(collectedMetrics[1]?.intervalMs).toBe(200);

    monitor.stop();
  });

  it("should invoke callback correctly when interval changes", () => {
    const callback = vi.fn();
    const monitor = createTestMonitor({ intervalMs: 500, callback });

    monitor.start();
    vi.advanceTimersByTime(550);
    expect(callback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(550);
    expect(callback).toHaveBeenCalledTimes(2);

    monitor.stop();
  });
});

/**
 * Creates default props for collectMetrics with custom overrides.
 */
function createCollectMetricsProps(overrides?: {
  prevCpu?: NodeJS.CpuUsage;
  prevHrtime?: bigint;
  prevLoop?: EventLoopUtilization;
  maxMemory?: number;
  maxLoop?: number;
  collectedAtMs?: number;
  previousCollectedAtMs?: number;
  intervalMs?: number;
}) {
  const now = Date.now();
  return {
    prevCpu: overrides?.prevCpu ?? process.cpuUsage(),
    prevHrtime: overrides?.prevHrtime ?? process.hrtime.bigint(),
    prevLoop: overrides?.prevLoop ?? ({ utilization: 0, idle: 0 } as EventLoopUtilization),
    maxMemory: overrides?.maxMemory ?? DEFAULT_CONFIG.maxMemory,
    maxLoop: overrides?.maxLoop ?? DEFAULT_CONFIG.maxLoop,
    collectedAtMs: overrides?.collectedAtMs ?? now,
    previousCollectedAtMs: overrides?.previousCollectedAtMs ?? now - 100,
    intervalMs: overrides?.intervalMs ?? DEFAULT_CONFIG.intervalMs,
  };
}

describe("collectMetrics", () => {
  it("should collect memory metrics", () => {
    const metrics = collectMetrics(createCollectMetricsProps());

    expect(metrics.memory).toHaveProperty("rss");
    expect(metrics.memory).toHaveProperty("heapTotal");
    expect(metrics.memory).toHaveProperty("heapUsed");
    expect(metrics.memory).toHaveProperty("external");
    expect(metrics.memory).toHaveProperty("arrayBuffers");

    assertNormalizedRatio(metrics.memory.ratio);
  });

  it("should collect CPU metrics", () => {
    const metrics = collectMetrics(createCollectMetricsProps());

    expect(metrics.cpu).toHaveProperty("user");
    expect(metrics.cpu).toHaveProperty("system");

    assertNormalizedRatio(metrics.cpu.ratio);
  });

  it("should collect event loop metrics", () => {
    const metrics = collectMetrics(
      createCollectMetricsProps({
        prevLoop: performance.eventLoopUtilization(),
      }),
    );

    expect(metrics.loop).toHaveProperty("utilization");
    expect(metrics.loop).toHaveProperty("idle");

    assertNormalizedRatio(metrics.loop.ratio);
  });

  it("should normalize memory ratio with extreme limits", () => {
    const metrics1 = collectMetrics(createCollectMetricsProps({ maxMemory: 1024 }));
    assertNormalizedRatio(metrics1.memory.ratio);

    const metrics2 = collectMetrics(
      createCollectMetricsProps({
        prevLoop: performance.eventLoopUtilization(),
        maxLoop: 0.1,
      }),
    );
    assertNormalizedRatio(metrics2.loop.ratio);
  });

  it("should calculate actualElapsedMs correctly", () => {
    const previousCollected = Date.now();
    const currentCollected = previousCollected + 150;

    const metrics = collectMetrics(
      createCollectMetricsProps({
        collectedAtMs: currentCollected,
        previousCollectedAtMs: previousCollected,
      }),
    );

    expect(metrics.actualElapsedMs).toBe(150);
    expect(metrics.collectedAt).toBe(currentCollected);
    expect(metrics.previousCollectedAt).toBe(previousCollected);
  });

  it("should normalize ratios correctly with custom limits", () => {
    // Test with extreme memory limit
    const metrics1 = collectMetrics(createCollectMetricsProps({ maxMemory: 2048 }));
    assertNormalizedRatio(metrics1.memory.ratio);

    // Test with extreme loop limit
    const metrics2 = collectMetrics(
      createCollectMetricsProps({
        prevLoop: performance.eventLoopUtilization(),
        maxLoop: 0.5,
      }),
    );
    assertNormalizedRatio(metrics2.loop.ratio);
  });
});
