import { test, expect } from '@playwright/test';
import { addTransaction, balanceOf, findTransaction, randomAmount, signIn, skipPinLock } from './helpers';

test.beforeAll(() => signIn());
test.beforeEach(({ page }) => skipPinLock(page));

test('expense lowers the account balance', async ({ page }) => {
  const amount = randomAmount();
  await addTransaction(page, amount, 'Income');
  const before = await balanceOf('E2E Bank');

  await addTransaction(page, amount, 'Expense');

  await expect.poll(() => balanceOf('E2E Bank')).toBe(before - amount);
});

test('expense above the balance cannot be saved', async ({ page }) => {
  const before = await balanceOf('E2E Bank');

  await page.goto('/transactions/new');
  await page.locator('#type').click();
  await page.getByRole('option', { name: 'Expense' }).click();
  await page.locator('#amount').fill(String(before + 1));

  await expect(page.getByText(/Exceeds balance/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save Transaction' })).toBeDisabled();
});

test('transfer moves money between accounts', async ({ page }) => {
  const amount = randomAmount();
  await addTransaction(page, amount, 'Income');
  const bank = await balanceOf('E2E Bank');
  const savings = await balanceOf('E2E Savings');

  await page.goto('/transactions/new');
  await page.locator('#amount').fill(String(amount));
  await page.locator('#type').click();
  await page.getByRole('option', { name: 'Transfer' }).click();
  await page.locator('#toAccount').click();
  await page.getByRole('option', { name: 'E2E Savings' }).click();
  await page.getByRole('button', { name: 'Save Transfer' }).click();
  await expect(page).toHaveURL(/\/transactions$/);

  await expect.poll(() => balanceOf('E2E Bank')).toBe(bank - amount);
  await expect.poll(() => balanceOf('E2E Savings')).toBe(savings + amount);
});

test('editing an amount adjusts the balance by the difference', async ({ page }) => {
  const amount = randomAmount();
  await addTransaction(page, amount, 'Income');
  const before = await balanceOf('E2E Bank');

  await (await findTransaction(page, amount)).click();
  await expect(page.locator('#amount')).not.toHaveValue('');
  await page.locator('#amount').fill(String(amount + 5_000));
  await page.getByRole('button', { name: 'Update Transaction' }).click();
  await expect(page.getByText('Transaction updated!')).toBeVisible();

  await expect.poll(() => balanceOf('E2E Bank')).toBe(before + 5_000);
});
