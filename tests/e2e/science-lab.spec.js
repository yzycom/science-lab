import { expect, test } from '@playwright/test';

async function expectNoConsoleErrors(page, run) {
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await run();

  expect(consoleErrors).toEqual([]);
}

async function expectSupportedViewport(page) {
  await expect(page.locator('#unsupportedViewport')).toBeHidden();
  const hasHorizontalOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth + 1
      || document.body.scrollWidth > window.innerWidth + 1;
  });
  expect(hasHorizontalOverflow).toBe(false);
}

async function expectCompactLessonLayout(page) {
  const metrics = await page.evaluate(() => {
    const library = document.querySelector('.lesson-library')?.getBoundingClientRect();
    const canvasHost = document.querySelector('.edulab-canvas-host')?.getBoundingClientRect();
    return {
      libraryWidth: library?.width || 0,
      canvasWidth: canvasHost?.width || 0,
    };
  });

  expect(metrics.libraryWidth).toBeLessThanOrEqual(260);
  expect(metrics.canvasWidth).toBeGreaterThanOrEqual(360);
}

async function openAllModes(page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Science Lab' })).toBeVisible();
  await expectSupportedViewport(page);
  await expect(page.locator('#canvas-container canvas')).toBeVisible();

  await page.getByRole('button', { name: '化合物' }).click();
  await expect(page.locator('#compoundWorkbench')).toBeVisible();
  await expect(page.locator('#compoundList .lesson-item').first()).toBeVisible();
  await expect(page.locator('#compoundDetail canvas')).toBeVisible();

  await page.getByRole('button', { name: '化学反应' }).click();
  await expect(page.locator('#lessonWorkbench')).toBeVisible();
  await expect(page.locator('#lessonList .lesson-item')).toHaveCount(6);
  await expect(page.locator('#lessonDetail canvas')).toBeVisible();
  await expect(page.locator('[data-edulab-progress]')).toBeVisible();

  await page.getByRole('button', { name: '数学课程' }).click();
  await expect(page.locator('#lessonList .lesson-item')).toHaveCount(9);
  await expect(page.locator('#lessonDetail canvas')).toBeVisible();
  await expect(page.locator('[data-edulab-step]').first()).toBeVisible();

  await page.locator('#lessonList .lesson-item').filter({ hasText: '解析几何' }).first().click();
  await expect(page.locator('#lessonDetail canvas')).toBeVisible();
  await expect(page.locator('[data-edulab-param]')).toBeVisible();
  await expectSupportedViewport(page);

  if (page.viewportSize().width < 1100) {
    await expectCompactLessonLayout(page);
  }
}

test('Science Lab keeps old modes and opens all Edulab native renderers on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await expectNoConsoleErrors(page, () => openAllModes(page));
});

test('Science Lab supports tablet and foldable landscape widths', async ({ page }) => {
  for (const viewport of [
    { width: 1024, height: 768 },
    { width: 820, height: 600 },
  ]) {
    await page.setViewportSize(viewport);
    await expectNoConsoleErrors(page, () => openAllModes(page));
  }
});

test('Science Lab blocks unsupported narrow viewports', async ({ page }) => {
  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 700, height: 600 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('#unsupportedViewport')).toBeVisible();
    await expect(page.locator('#unsupportedViewport')).toContainText('请使用电脑、平板横屏或展开后的折叠屏横屏浏览');
    await expect(page.locator('#canvas-container')).toHaveCSS('pointer-events', 'none');
    await expect(page.locator('.mode-toggle')).toHaveCSS('pointer-events', 'none');
  }
});
