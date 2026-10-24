/**
 * Shared fitView options used across all fitView call sites.
 *
 * IMPORTANT: Every fitView invocation must use these options to ensure
 * auto-layout, load, and the Controls fit-view button produce identical
 * zoom/centering. See layout-consistency.test.ts for regression tests.
 */
/**
 * Lowest zoom the canvas allows. React Flow defaults to 0.5, which is too
 * close to fit diagrams of a few dozen nodes on screen.
 */
export const MIN_ZOOM = 0.05;

export const FIT_VIEW_OPTIONS = {
  padding: 0.15,
  duration: 300,
  minZoom: MIN_ZOOM,
  maxZoom: 1.5,
} as const;
