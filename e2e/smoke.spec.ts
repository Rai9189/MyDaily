import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('pinUnlocked', 'true'));
});

// Random amount: it's the only text that identifies this row in the list and Trash.
const amount = 100_000 + Math.floor(Math.random() * 899_999);
const amountLabel = new Intl.NumberFormat('id-ID').format(amount);

async function findTransaction(page: Page) {
  await page.getByPlaceholder('Search transactions...').fill(String(amount));
  return page.getByRole('row').filter({ hasText: amountLabel });
}

test('transaction can be added, deleted and restored from Trash', async ({ page }) => {
  await page.goto('/transactions/new');
  await page.locator('#amount').fill(String(amount));
  await page.locator('#type').click();
  await page.getByRole('option', { name: 'Income' }).click();
  await page.locator('#category').click();
  await page.getByRole('option', { name: 'E2E Income' }).click();
  await page.getByRole('button', { name: 'Save Transaction' }).click();
  await expect(page).toHaveURL(/\/transactions$/);

  const row = await findTransaction(page);
  await expect(row).toBeVisible();

  await row.locator('button:has(.lucide-trash-2)').click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  // The open dialog hides the row from getByRole, so wait for the toast instead.
  await expect(page.getByText('Transaction deleted')).toBeVisible();
  await expect(row).toBeHidden();

  await page.goto('/trash');
  const trashRow = page.locator('.divide-y > div').filter({ hasText: amountLabel });
  await expect(trashRow).toBeVisible();
  await trashRow.locator('button:has(.lucide-rotate-ccw)').click();
  await expect(page.getByText('Transaction restored!')).toBeVisible();
  await expect(trashRow).toBeHidden();

  await page.goto('/transactions');
  await expect(await findTransaction(page)).toBeVisible();
});
