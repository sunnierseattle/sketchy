import { expect, test } from '@playwright/test';
import { createNode, getNodeIds, resetApp, updateNodeText } from './helpers';

test.beforeEach(async ({ page }) => {
  await resetApp(page);
});

test('markdown lists in a node keep their bullets and numbers', async ({ page }) => {
  await createNode(page, 100, 100);
  const [nodeId] = await getNodeIds(page);
  await updateNodeText(page, nodeId, '1. first\n2. second\n\n- bullet');

  const label = page.locator(`[data-node-id="${nodeId}"] .entity-node-label`);
  await expect(label.locator('ol li')).toHaveCount(2);
  await expect(label.locator('ul li')).toHaveCount(1);

  const listStyles = await label.evaluate((el) => ({
    ol: getComputedStyle(el.querySelector('ol')!).listStyleType,
    ul: getComputedStyle(el.querySelector('ul')!).listStyleType,
  }));
  expect(listStyles).toEqual({ ol: 'decimal', ul: 'disc' });
});

test('task lists show checkboxes without an extra bullet', async ({ page }) => {
  await createNode(page, 100, 100);
  const [nodeId] = await getNodeIds(page);
  await updateNodeText(page, nodeId, '- [ ] todo\n- [x] done');

  const list = page.locator(`[data-node-id="${nodeId}"] .entity-node-label ul`);
  await expect(list.locator('input[type="checkbox"]')).toHaveCount(2);
  expect(await list.evaluate((el) => getComputedStyle(el).listStyleType)).toBe('none');
});
