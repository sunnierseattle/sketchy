import { expect, test, type Page } from '@playwright/test';
import { resetApp, waitForViewportStable } from './helpers';

type StoreWindow = Window & {
  __diagramStore: {
    getState: () => {
      batchApply: (m: { addNodes: { id: string; label: string }[]; addEdges: { source: string; target: string }[] }) => void;
      runAutoLayout: (o: { commitHistory?: boolean; fitView?: boolean }) => Promise<boolean>;
    };
  };
};

/** A wide tree: one root with `width` children (causes point at their effect). */
async function buildWideTree(page: Page, width: number) {
  await page.evaluate(async (n) => {
    const store = (window as unknown as StoreWindow).__diagramStore;
    const nodes = [{ id: 'root', label: 'Root effect' }];
    const edges: { source: string; target: string }[] = [];
    for (let i = 0; i < n; i++) {
      nodes.push({ id: `c${i}`, label: `Cause ${i}` });
      edges.push({ source: `c${i}`, target: 'root' });
    }
    store.getState().batchApply({ addNodes: nodes, addEdges: edges });
    await store.getState().runAutoLayout({ commitHistory: true, fitView: true });
  }, width);
}

test.beforeEach(async ({ page }) => {
  await resetApp(page);
});

test('fit view zooms out far enough to show every node of a large diagram', async ({ page }) => {
  await buildWideTree(page, 40);

  const pane = page.locator('[data-testid="diagram-flow"] .react-flow__renderer');
  await expect.poll(async () => {
    const paneBox = (await pane.boundingBox())!;
    const boxes = await page.locator('.react-flow__node-entity').evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect));
    return boxes.every((b) => b.left >= paneBox.x - 1 && b.right <= paneBox.x + paneBox.width + 1);
  }, { timeout: 5000 }).toBe(true);
});

test('fit view goes below 50% zoom and zoom out stays available', async ({ page }) => {
  await buildWideTree(page, 40);
  await page.waitForTimeout(400);
  const zoom = await waitForViewportStable(page);
  expect(zoom).toBeLessThan(0.5);
  await expect(page.locator('.react-flow__controls-zoomout')).toBeEnabled();
});

test('a second auto-layout right after the first changes nothing', async ({ page }) => {
  const moved = await page.evaluate(async () => {
    const store = (window as unknown as StoreWindow).__diagramStore;
    const words = 'cost demand quality delay staff morale backlog churn revenue pricing training errors rework'.split(' ');
    const nodes = Array.from({ length: 24 }, (_, i) => ({
      id: `n${i}`,
      // Long, varied labels so estimated and rendered heights differ.
      label: Array.from({ length: 2 + ((i * 7) % 19) }, (_, k) => words[(i + k) % words.length]).join(' '),
    }));
    const edges = nodes.slice(1).map((n, i) => ({ source: n.id, target: `n${Math.floor(i / 3)}` }));
    edges.push({ source: 'n20', target: 'n2' }); // a cross-link, so the layered engine is used
    store.getState().batchApply({ addNodes: nodes, addEdges: edges });
    await store.getState().runAutoLayout({ commitHistory: true, fitView: false });
    type S = { diagram: { nodes: { id: string; position: { x: number; y: number } }[] } };
    const snap = () => new Map((store.getState() as unknown as S).diagram.nodes.map((n) => [n.id, { ...n.position }]));
    const first = snap();
    await store.getState().runAutoLayout({ commitHistory: true, fitView: false });
    const second = snap();
    return [...first].filter(([id, p]) => Math.hypot(p.x - second.get(id)!.x, p.y - second.get(id)!.y) > 1).length;
  });
  expect(moved).toBe(0);
});

test('auto-layout hangs a wide org chart\'s reports in columns instead of one long row', async ({ page }) => {
  await page.evaluate(async () => {
    const store = (window as unknown as StoreWindow).__diagramStore;
    const nodes = [{ id: 'ceo', label: 'CEO' }];
    const edges: { source: string; target: string }[] = [];
    for (let m = 0; m < 6; m++) {
      nodes.push({ id: `m${m}`, label: `Manager ${m}` });
      edges.push({ source: `m${m}`, target: 'ceo' });
      for (let r = 0; r < 7; r++) {
        nodes.push({ id: `m${m}r${r}`, label: `Report ${m}.${r}` });
        edges.push({ source: `m${m}r${r}`, target: `m${m}` });
      }
    }
    store.getState().batchApply({ addNodes: nodes, addEdges: edges });
    await store.getState().runAutoLayout({ commitHistory: true, fitView: true });
  });

  const shape = await page.evaluate(() => {
    const store = (window as unknown as { __diagramStore: { getState: () => { diagram: { nodes: { position: { x: number; y: number }; data: { label: string } }[] } } } }).__diagramStore;
    const reports = store.getState().diagram.nodes.filter((n) => n.data.label.startsWith('Report 0.'));
    return {
      columns: new Set(reports.map((n) => Math.round(n.position.x))).size,
      rows: new Set(reports.map((n) => Math.round(n.position.y))).size,
    };
  });
  // Side by side, the 7 reports would be 7 columns in one row.
  expect(shape).toEqual({ columns: 2, rows: 4 });
});
