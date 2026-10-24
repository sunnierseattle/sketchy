import { expect, test } from '@playwright/test';
import { addEdge, createNode, getNodeIds, resetApp, updateNodeText } from './helpers';

test.beforeEach(async ({ page }) => {
  await resetApp(page, 'cld');
});

test('long unbroken labels wrap in the loop list instead of widening the side panel', async ({ page }) => {
  await createNode(page, 0, 0);
  await createNode(page, 300, 0);
  const [a, b] = await getNodeIds(page);
  await updateNodeText(page, a, 'Supercalifragilistic_' + 'A'.repeat(120));
  await addEdge(page, a, b);
  await addEdge(page, b, a);

  const loopCard = page.locator('.side-panel button[aria-pressed]').first();
  await expect(loopCard).toContainText('Supercalifragilistic_');

  const overflow = await page.locator('.side-panel').evaluate((panel) => {
    const scrollers = [panel, ...panel.querySelectorAll('*')].filter(
      (el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible',
    );
    return scrollers.map((el) => el.className);
  });
  expect(overflow).toEqual([]);
});
