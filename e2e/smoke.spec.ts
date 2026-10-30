import { test, expect } from '@playwright/test';
import { addTransaction, amountLabel, balanceOf, findTransaction, randomAmount, signIn, skipPinLock } from './helpers';

test.beforeAll(() => signIn());
test.beforeEach(({ page }) => skipPinLock(page));

test('transaction can be added, deleted and restored from Trash', async ({ page }) => {
  const amount = randomAmount();
  const before = await balanceOf('E2E Bank');

  await addTransaction(page, amount, 'Income');
  const row = await findTransaction(page, amount);
  await expect(row).toBeVisible();
  await expect.poll(() => balanceOf('E2E Bank')).toBe(before + amount);

  await row.locator('button:has(.lucide-trash-2)').click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  // The open dialog hides the row from getByRole, so wait for the toast instead.
  await expect(page.getByText('Transaction deleted')).toBeVisible();
  await expect(row).toBeHidden();
  await expect.poll(() => balanceOf('E2E Bank')).toBe(before);

  await page.goto('/trash');
  const trashRow = page.locator('.divide-y > div').filter({ hasText: amountLabel(amount) });
  await expect(trashRow).toBeVisible();
  await trashRow.locator('button:has(.lucide-rotate-ccw)').click();
  await expect(page.getByText('Transaction restored!')).toBeVisible();
  await expect(trashRow).toBeHidden();
  await expect.poll(() => balanceOf('E2E Bank')).toBe(before + amount);

  await page.goto('/transactions');
  await expect(await findTransaction(page, amount)).toBeVisible();
});
