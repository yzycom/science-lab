import { expect, test } from '@playwright/test';

test('Science Lab keeps old modes and opens all Edulab native renderers', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Science Lab' })).toBeVisible();
  await expect(page.locator('#canvas-container canvas')).toBeVisible();

  await page.getByRole('button', { name: '化合物' }).click();
  await expect(page.locator('#compoundPanel')).toBeVisible();
  await expect(page.locator('.compound-item').first()).toBeVisible();

  await page.getByRole('button', { name: '化学反应' }).click();
  await expect(page.locator('#lessonWorkbench')).toBeVisible();
  await expect(page.locator('.lesson-item')).toHaveCount(6);
  await expect(page.locator('#lessonDetail canvas')).toBeVisible();
  await expect(page.locator('[data-edulab-progress]')).toBeVisible();

  await page.getByRole('button', { name: '数学课程' }).click();
  await expect(page.locator('.lesson-item')).toHaveCount(9);
  await expect(page.locator('#lessonDetail canvas')).toBeVisible();
  await expect(page.locator('[data-edulab-step]').first()).toBeVisible();

  await page.locator('.lesson-item').filter({ hasText: '解析几何' }).first().click();
  await expect(page.locator('#lessonDetail canvas')).toBeVisible();
  await expect(page.locator('[data-edulab-param]')).toBeVisible();

  expect(consoleErrors).toEqual([]);
});
