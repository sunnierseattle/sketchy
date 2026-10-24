import { expect, test } from '@playwright/test';
import { addEdge, createNode, getNodeIds, resetApp } from './helpers';

test.beforeEach(async ({ page }) => {
  await resetApp(page, 'crt');
});

test('an AND junction shows its symbol, without hovering, where causes arrive', async ({ page }) => {
  await createNode(page, 200, 0);
  await createNode(page, 0, 300);
  await createNode(page, 400, 300);
  const [effect, causeA, causeB] = await getNodeIds(page);
  await addEdge(page, causeA, effect);
  await addEdge(page, causeB, effect);
  await page.evaluate((id) => {
    (window as unknown as { __diagramStore: { getState: () => { updateNodeJunction: (id: string, t: string) => void } } })
      .__diagramStore.getState().updateNodeJunction(id, 'and');
  }, effect);
  await page.mouse.move(0, 0);

  const effectNode = page.locator(`[data-node-id="${effect}"]`);
  const symbol = effectNode.locator('.junction-symbol');
  await expect(symbol).toHaveText('&');
  await expect.poll(() => symbol.evaluate((el) => {
    let opacity = 1;
    for (let e: Element | null = el; e; e = e.parentElement) opacity *= Number(getComputedStyle(e).opacity);
    return opacity;
  })).toBe(1);

  // CRT lays out bottom-to-top, so causes arrive at the bottom handle. React
  // Flow anchors bottom edges at the handle box's bottom edge; the symbol sits there.
  const handle = (await effectNode.locator('.junction-marked').boundingBox())!;
  const mark = (await symbol.boundingBox())!;
  const node = (await effectNode.boundingBox())!;
  expect(handle.y + handle.height / 2).toBeCloseTo(node.y + node.height, -1);
  expect(Math.abs(mark.y + mark.height / 2 - (handle.y + handle.height))).toBeLessThan(2);
  expect(Math.abs(mark.x + mark.width / 2 - (handle.x + handle.width / 2))).toBeLessThan(2);
});
