import { test, expect, type Page } from '@playwright/test';
import { signIn, supabase } from './helpers';

const { E2E_EMAIL, E2E_PIN } = process.env as Record<string, string>;
const WRONG_PIN = E2E_PIN === '0000' ? '1111' : '0000';

async function submitPin(page: Page, pin: string) {
  await page.locator('input[inputmode="numeric"]').fill(pin);
  await page.getByRole('button', { name: 'Unlock' }).click();
}

async function submitLogin(page: Page, password: string) {
  await page.locator('#email').fill(E2E_EMAIL);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

test.describe('PIN lock', () => {
  test.beforeAll(() => signIn());

  // Failed attempts live on the shared test user, so never leave it locked.
  test.afterEach(async () => {
    const { data } = await supabase.auth.getUser();
    await supabase
      .from('users')
      .update({ pin_attempts: 0, pin_locked_until: null })
      .eq('id', data.user!.id);
  });

  test('app stays locked until the correct PIN, then returns to the page', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page).toHaveURL(/\/pin-lock/);

    await submitPin(page, WRONG_PIN);
    await expect(page.getByText('Wrong PIN! 4 attempt')).toBeVisible();
    await expect(page).toHaveURL(/\/pin-lock/);

    await submitPin(page, E2E_PIN);
    await expect(page).toHaveURL(/\/transactions$/);
  });

  test('five wrong PINs lock the app, and reloading does not clear it', async ({ page }) => {
    await page.goto('/pin-lock');

    for (let attemptsLeft = 4; attemptsLeft >= 1; attemptsLeft--) {
      await submitPin(page, WRONG_PIN);
      await expect(page.getByText(`Wrong PIN! ${attemptsLeft} attempt`)).toBeVisible();
    }
    await submitPin(page, WRONG_PIN);
    await expect(page.getByText('App Locked')).toBeVisible();

    await page.reload();
    await expect(page.getByText('App Locked')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Locked/ })).toBeDisabled();
  });
});

test.describe('login', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('protected pages redirect to login when signed out', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page).toHaveURL(/\/login/);
  });

  test('wrong password shows an error and locks after three attempts', async ({ page }) => {
    await page.goto('/login');

    await submitLogin(page, 'wrong-password');
    await expect(page.getByText('2 attempts remaining')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    await submitLogin(page, 'wrong-password');
    await expect(page.getByText(/1 attempt remaining/).first()).toBeVisible();

    await submitLogin(page, 'wrong-password');
    await expect(page.getByText(/Account temporarily locked/)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Locked/ })).toBeDisabled();
  });
});
