import { test as setup, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, E2E_EMAIL, E2E_PASSWORD, E2E_PIN } =
  process.env as Record<string, string>;

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

const signIn = () =>
  supabase.auth.signInWithPassword({ email: E2E_EMAIL, password: E2E_PASSWORD });

async function registerAndSetPin(page: Page) {
  await page.goto('/register');
  await page.locator('#name').fill('Test User');
  await page.locator('#email').fill(E2E_EMAIL);
  await page.locator('#password').fill(E2E_PASSWORD);
  await page.locator('#confirmPassword').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Create Account' }).click();

  await expect(page).toHaveURL(/\/pin-setup/);
  await page.locator('#pin').fill(E2E_PIN);
  await page.locator('#confirmPin').fill(E2E_PIN);
  await page.getByRole('button', { name: 'Save PIN' }).click();
}

async function logInAndUnlock(page: Page) {
  await page.goto('/login');
  await page.locator('#email').fill(E2E_EMAIL);
  await page.locator('#password').fill(E2E_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/\/pin-lock/);
  await page.locator('input[inputmode="numeric"]').fill(E2E_PIN);
  await page.getByRole('button', { name: 'Unlock' }).click();
}

// New users start with no accounts or categories, and a transaction needs both.
async function seedTestData() {
  const { data, error } = await signIn();
  if (error) throw error;
  const user_id = data.user.id;

  const { data: accounts } = await supabase.from('accounts').select('id').is('deleted_at', null);
  if (!accounts?.length) {
    const { error: e } = await supabase
      .from('accounts')
      .insert({ user_id, name: 'E2E Bank', type: 'Bank', balance: 0, is_primary: true });
    if (e) throw e;
  }

  const { data: categories } = await supabase
    .from('categories')
    .select('id')
    .eq('name', 'E2E Income')
    .is('deleted_at', null);
  if (!categories?.length) {
    const { error: e } = await supabase
      .from('categories')
      .insert({ user_id, name: 'E2E Income', type: 'transaction', subtype: 'income', color: '#22c55e' });
    if (e) throw e;
  }
}

// First run on an empty test database registers the account; later runs log in.
setup('sign in, registering the test account if needed', async ({ page }) => {
  const { error } = await signIn();
  await (error ? registerAndSetPin(page) : logInAndUnlock(page));
  await expect(page).toHaveURL(/\/$/);

  await seedTestData();

  // Keeps the Supabase session only: pinUnlocked is in sessionStorage, which
  // storageState doesn't save, so smoke.spec.ts sets it with addInitScript.
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
