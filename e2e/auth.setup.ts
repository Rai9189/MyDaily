import { test as setup, expect, type Page } from '@playwright/test';
import { signIn, supabase } from './helpers';

const { E2E_EMAIL, E2E_PASSWORD, E2E_PIN } = process.env as Record<string, string>;

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

async function ensureRow(table: string, name: string, row: Record<string, unknown>) {
  const { data } = await supabase.from(table).select('id').eq('name', name).is('deleted_at', null);
  if (data?.length) return;
  const { error } = await supabase.from(table).insert({ name, ...row });
  if (error) throw error;
}

// New users start with no accounts or categories, and a transaction needs both.
async function seedTestData() {
  const { data, error } = await signIn();
  if (error) throw error;
  const user_id = data.user.id;

  await ensureRow('accounts', 'E2E Bank', { user_id, type: 'Bank', balance: 0, is_primary: true });
  await ensureRow('accounts', 'E2E Savings', { user_id, type: 'Bank', balance: 0, is_primary: false });
  await ensureRow('categories', 'E2E Income', { user_id, type: 'transaction', subtype: 'income', color: '#22c55e' });
  await ensureRow('categories', 'E2E Expense', { user_id, type: 'transaction', subtype: 'expense', color: '#ef4444' });
}

// First run on an empty test database registers the account; later runs log in.
setup('sign in, registering the test account if needed', async ({ page }) => {
  const { error } = await signIn();
  await (error ? registerAndSetPin(page) : logInAndUnlock(page));
  await expect(page).toHaveURL(/\/$/);

  await seedTestData();

  // Keeps the Supabase session; specs restore the PIN unlock with skipPinLock.
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
