import { test, expect } from '@playwright/test';

test('basic test', async ({ page }) => {
  await page.goto('https://example.com');
  expect(await page.textContent('h1')).toBe('Example Domain');
});