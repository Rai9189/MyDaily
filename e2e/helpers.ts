import { expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, E2E_EMAIL, E2E_PASSWORD } =
  process.env as Record<string, string>;

export const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

export const signIn = () =>
  supabase.auth.signInWithPassword({ email: E2E_EMAIL, password: E2E_PASSWORD });

// pinUnlocked is in sessionStorage, which storageState doesn't save.
export const skipPinLock = (page: Page) =>
  page.addInitScript(() => sessionStorage.setItem('pinUnlocked', 'true'));

// Random amounts: the amount is the only text that identifies a row in the list and Trash.
export const randomAmount = () => 100_000 + Math.floor(Math.random() * 899_999);
export const amountLabel = (amount: number) => new Intl.NumberFormat('id-ID').format(amount);

export async function balanceOf(accountName: string) {
  const { data, error } = await supabase
    .from('accounts')
    .select('balance')
    .eq('name', accountName)
    .is('deleted_at', null)
    .single();
  if (error) throw error;
  return Number(data.balance);
}

export async function addTransaction(page: Page, amount: number, type: 'Income' | 'Expense') {
  await page.goto('/transactions/new');
  await page.locator('#amount').fill(String(amount));
  await page.locator('#type').click();
  await page.getByRole('option', { name: type }).click();
  await page.locator('#category').click();
  await page.getByRole('option', { name: `E2E ${type}` }).click();
  await page.getByRole('button', { name: 'Save Transaction' }).click();
  await expect(page).toHaveURL(/\/transactions$/);
}

export async function findTransaction(page: Page, amount: number) {
  await page.getByPlaceholder('Search transactions...').fill(String(amount));
  return page.getByRole('row').filter({ hasText: amountLabel(amount) });
}
