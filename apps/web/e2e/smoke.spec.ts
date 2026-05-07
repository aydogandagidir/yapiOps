import { expect, test } from '@playwright/test';

/**
 * Phase 0 smoke tests. These verify the foundation is wired correctly:
 * - Locale routing works (root → /tr/login).
 * - Login page renders the localized title.
 * - Locale switch /tr ↔ /en swaps copy.
 *
 * Add full signup → trial → checkout flows in Phase 1 once Supabase local
 * dev and Iyzico sandbox plan refs are configured.
 */

test('root redirects to /tr/login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/tr\/login/);
});

test('login page renders Turkish title by default', async ({ page }) => {
  await page.goto('/tr/login');
  await expect(page.getByRole('heading', { name: 'Giriş Yap' })).toBeVisible();
});

test('login page renders English title with /en prefix', async ({ page }) => {
  await page.goto('/en/login');
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
});

test('signup link from login navigates to /tr/signup', async ({ page }) => {
  await page.goto('/tr/login');
  await page.getByRole('link', { name: 'Hesap Oluştur' }).click();
  await expect(page).toHaveURL(/\/tr\/signup/);
  await expect(page.getByRole('heading', { name: 'Hesap Oluştur' })).toBeVisible();
});
