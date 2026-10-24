import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerMeasuringCanvas, waitForMeasuredNodes } from '../node-measurement';

type N = { size?: { width: number; height: number } };

describe('waitForMeasuredNodes', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('resolves immediately when no canvas is mounted to measure nodes', async () => {
    const nodes: N[] = [{}];
    let resolved = false;
    void waitForMeasuredNodes(() => nodes).then(() => { resolved = true; });
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(true);
  });

  it('waits until every node is measured when a canvas is mounted', async () => {
    const unregister = registerMeasuringCanvas();
    const nodes: N[] = [{}, { size: { width: 1, height: 1 } }];
    let resolved = false;
    void waitForMeasuredNodes(() => nodes).then(() => { resolved = true; });

    await vi.advanceTimersByTimeAsync(100);
    expect(resolved).toBe(false);

    nodes[0].size = { width: 160, height: 80 };
    await vi.advanceTimersByTimeAsync(50);
    expect(resolved).toBe(true);
    unregister();
  });

  it('gives up after the timeout so layout never hangs', async () => {
    const unregister = registerMeasuringCanvas();
    let resolved = false;
    void waitForMeasuredNodes(() => [{}], 300).then(() => { resolved = true; });

    await vi.advanceTimersByTimeAsync(299);
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(30);
    expect(resolved).toBe(true);
    unregister();
  });
});
