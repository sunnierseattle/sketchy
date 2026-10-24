/** How long auto-layout waits for freshly created nodes to be measured. */
const MEASUREMENT_WAIT_MS = 500;
const POLL_MS = 25;

let mountedCanvases = 0;

/**
 * The canvas registers while mounted. Node sizes are only measured when a
 * canvas renders them, so without one there is nothing to wait for.
 */
export function registerMeasuringCanvas(): () => void {
  mountedCanvases++;
  return () => {
    mountedCanvases--;
  };
}

/**
 * Resolve once every node has a measured size, or after `timeoutMs`.
 *
 * Laying out with estimated heights and then again with measured ones gives
 * two different layouts, so the first layout should use measured sizes.
 */
export async function waitForMeasuredNodes(
  getNodes: () => readonly { size?: unknown }[],
  timeoutMs = MEASUREMENT_WAIT_MS,
): Promise<void> {
  const allMeasured = () => getNodes().every((node) => node.size);
  if (mountedCanvases === 0) return;
  for (let waited = 0; waited < timeoutMs && !allMeasured(); waited += POLL_MS) {
    await new Promise((resolve) => setTimeout(resolve, Math.min(POLL_MS, timeoutMs - waited)));
  }
}
