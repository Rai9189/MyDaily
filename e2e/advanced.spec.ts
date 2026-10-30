import { test, expect, type Page } from '@playwright/test';
import { addTransaction, balanceOf, randomAmount, signIn, skipPinLock, supabase } from './helpers';

const { E2E_PIN } = process.env as Record<string, string>;
const WRONG_PIN = E2E_PIN === '0000' ? '1111' : '0000';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

test.beforeAll(() => signIn());
test.beforeEach(({ page }) => skipPinLock(page));

async function resetPinAttempts() {
  const { data } = await supabase.auth.getUser();
  await supabase.from('users').update({ pin_attempts: 0, pin_locked_until: null }).eq('id', data.user!.id);
}

async function fillIncomeForm(page: Page, amount: number) {
  await page.goto('/transactions/new');
  await page.locator('#amount').fill(String(amount));
  await page.locator('#type').click();
  await page.getByRole('option', { name: 'Income' }).click();
  await page.locator('#category').click();
  await page.getByRole('option', { name: 'E2E Income' }).click();
}

async function openNewTransaction(page: Page) {
  const amount = randomAmount();
  await addTransaction(page, amount, 'Income');
  const { data } = await supabase.from('transactions').select('id').eq('amount', amount).single();
  await page.goto(`/transactions/${data!.id}`);
  await expect(page.locator('#amount')).not.toHaveValue('');
  return data!.id as string;
}

async function exportCsv(page: Page) {
  await page.goto('/settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export to CSV' }).click();
  const stream = await (await download).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

async function insertWithDescription(description: string) {
  const { data: user } = await supabase.auth.getUser();
  const account = await supabase.from('accounts').select('id').eq('name', 'E2E Bank').single();
  const category = await supabase.from('categories').select('id').eq('name', 'E2E Income').single();
  await supabase.from('transactions').insert({
    user_id: user.user!.id, account_id: account.data!.id, category_id: category.data!.id,
    amount: 1, type: 'income', date: '2026-01-01', description,
  });
}

test.describe('tax', () => {
  test('percentage tax is recorded as a separate expense', async ({ page }) => {
    await addTransaction(page, 500_000, 'Income');
    const before = await balanceOf('E2E Bank');

    await page.goto('/transactions/new');
    await page.locator('#amount').fill('100000');
    await page.locator('#type').click();
    await page.getByRole('option', { name: 'Expense' }).click();
    await page.locator('#category').click();
    await page.getByRole('option', { name: 'E2E Expense' }).click();
    await page.getByRole('switch').click();
    await page.getByPlaceholder('0').nth(1).fill('10');
    await page.getByRole('button', { name: 'Save Transaction' }).click();
    await expect(page).toHaveURL(/\/transactions$/);

    await expect.poll(() => balanceOf('E2E Bank')).toBe(before - 110_000);
  });

  test('tax that pushes the total over the balance is blocked', async ({ page }) => {
    const balance = await balanceOf('E2E Bank');

    await page.goto('/transactions/new');
    await page.locator('#amount').fill(String(balance));
    await page.locator('#type').click();
    await page.getByRole('option', { name: 'Expense' }).click();
    await page.getByRole('switch').click();
    await page.getByPlaceholder('0').nth(1).fill('10');

    await expect(page.getByRole('button', { name: 'Save Transaction' })).toBeDisabled();
  });
});

test.describe('form helpers', () => {
  test('template saves and fills a new form', async ({ page }) => {
    const amount = randomAmount();
    const name = `Tpl ${amount}`;
    await fillIncomeForm(page, amount);
    await page.getByRole('button', { name: 'Save as Template' }).click();
    await page.getByPlaceholder('Template name (e.g.: Monthly Salary)').fill(name);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText(`Template "${name}" saved!`)).toBeVisible();

    await page.goto('/transactions/new');
    await page.getByRole('button', { name: new RegExp(name) }).click();
    await expect(page.locator('#amount')).toHaveValue(new Intl.NumberFormat('id-ID').format(amount));
  });

  test('unsaved form is restored as a draft', async ({ page }) => {
    await fillIncomeForm(page, 777_000);
    await page.waitForTimeout(800);

    await page.reload();
    await expect(page.getByText('Draft restored from your last unsaved transaction.')).toBeVisible();
    await expect(page.locator('#amount')).toHaveValue('777.000');
  });
});

test.describe('attachments', () => {
  test('a valid image uploads', async ({ page }) => {
    const id = await openNewTransaction(page);
    await page.locator('input[type="file"]').setInputFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.getByText('Upload complete')).toBeVisible();

    const { data } = await supabase.from('attachments').select('id').eq('attachable_id', id);
    expect(data).toHaveLength(1);
  });

  test('an unsupported file type is refused', async ({ page }) => {
    const id = await openNewTransaction(page);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'evil.html', mimeType: 'text/html', buffer: Buffer.from('<script>alert(1)</script>'),
    });
    await expect(page.getByText(/Tipe file tidak didukung/)).toBeVisible();

    const { data } = await supabase.from('attachments').select('id').eq('attachable_id', id);
    expect(data).toEqual([]);
  });

  test('a file over 10 MB is refused', async ({ page }) => {
    await openNewTransaction(page);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
    });
    await expect(page.getByText(/File terlalu besar/)).toBeVisible();
  });

  // BUG: handleFileUpload shows the success toast even when every upload failed.
  test.fail('a failed upload does not claim success', async ({ page }) => {
    await openNewTransaction(page);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'evil.html', mimeType: 'text/html', buffer: Buffer.from('x'),
    });
    await expect(page.getByText(/Tipe file tidak didukung/)).toBeVisible();
    await expect(page.getByText('Upload complete')).toBeHidden({ timeout: 2_000 });
  });
});

test.describe('PDF import', () => {
  test.beforeEach(({ page }) => page.goto('/transactions/import'));
  const upload = (page: Page, mimeType: string, content: string) =>
    page.locator('input[type="file"]').setInputFiles({ name: 'statement.pdf', mimeType, buffer: Buffer.from(content) });

  test('refuses a non-PDF file', async ({ page }) => {
    await upload(page, 'text/plain', 'hello');
    await expect(page.getByText('Please choose a PDF file.')).toBeVisible();
  });

  test('reports a damaged PDF instead of crashing', async ({ page }) => {
    await upload(page, 'application/pdf', 'this is not really a pdf');
    await expect(page.getByText(/Could not read this PDF/)).toBeVisible();
  });
});

test.describe('profile and settings', () => {
  test.afterEach(resetPinAttempts);

  test('profile name updates', async ({ page }) => {
    await page.goto('/profile');
    await page.locator('#name').fill('Renamed User');
    await page.locator('button[type="submit"]').first().click();
    await expect(page.getByText('Profile updated successfully!')).toBeVisible();

    const { data: user } = await supabase.auth.getUser();
    const { data } = await supabase.from('users').select('name').eq('id', user.user!.id).single();
    expect(data!.name).toBe('Renamed User');
    await supabase.from('users').update({ name: 'Test User' }).eq('id', user.user!.id);
  });

  test('avatar refuses unsupported and oversized files', async ({ page }) => {
    await page.goto('/profile');
    const input = page.locator('input[type="file"]');

    await input.setInputFiles({ name: 'a.gif', mimeType: 'image/gif', buffer: PNG });
    await expect(page.getByText('Only JPEG, PNG, and WebP images are supported')).toBeVisible();

    await input.setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: Buffer.alloc(2 * 1024 * 1024 + 1) });
    await expect(page.getByText('Image must be smaller than 2MB')).toBeVisible();
  });

  test('changing the PIN needs the current PIN', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: /PIN/ }).first().click();
    await page.locator('#oldPin').fill(WRONG_PIN);
    await page.locator('#oldPin').press('Enter');
    await expect(page.getByText('Wrong PIN. 2 attempts remaining.').first()).toBeVisible();
    await expect(page).toHaveURL(/\/settings/);
  });
});

test.describe('CSV export', () => {
  test('includes transactions', async ({ page }) => {
    expect(await exportCsv(page)).toContain('Date,Description,Type,Category,Account,Amount');
  });

  // BUG: cells aren't escaped, so a quote in a description breaks the columns.
  test.fail('escapes quotes in a description', async ({ page }) => {
    await insertWithDescription('say "hi", ok');
    expect(await exportCsv(page)).toContain('"say ""hi"", ok"');
  });

  // BUG: spreadsheets run cells starting with = as formulas (CSV injection).
  test.fail('neutralises spreadsheet formulas', async ({ page }) => {
    await insertWithDescription('=HYPERLINK("http://example.com")');
    expect(await exportCsv(page)).not.toContain('"=HYPERLINK');
  });

  // BUG: descriptions are stored as HTML and exported with their tags.
  test.fail('exports descriptions as plain text', async ({ page }) => {
    await insertWithDescription('<p>plain note</p>');
    expect(await exportCsv(page)).not.toContain('<p>plain note</p>');
  });
});
