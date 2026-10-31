import { test, expect, type Page } from '@playwright/test';
import { addTransaction, balanceOf, clearPinLock, randomAmount, signIn, skipPinLock, supabase } from './helpers';

const { E2E_PIN } = process.env as Record<string, string>;
const WRONG_PIN = E2E_PIN === '0000' ? '1111' : '0000';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

test.beforeAll(() => signIn());
test.beforeEach(({ page }) => skipPinLock(page));

// 9:16, red on top and blue below, so a test can tell which part was cropped.
async function tallPhoto(page: Page) {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 270;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 270, 240);
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(0, 240, 270, 240);
    return canvas.toDataURL('image/png');
  });
  return { name: 'tall.png', mimeType: 'image/png', buffer: Buffer.from(dataUrl.split(',')[1], 'base64') };
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

async function exportCsv(page: Page, from = '', to = '') {
  await page.goto('/settings');
  await page.locator('#exportFrom').fill(from);
  await page.locator('#exportTo').fill(to);
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
    await page.getByRole('button', { name: /^Templates/ }).click();
    await page.getByLabel('Search templates').fill(name);
    await page.getByRole('button', { name: new RegExp(name) }).click();
    await expect(page.locator('#amount')).toHaveValue(new Intl.NumberFormat('id-ID').format(amount));
    await expect(page.getByRole('dialog')).toBeHidden();

    await page.getByRole('button', { name: /^Templates/ }).click();
    await page.getByLabel('Search templates').fill('no such template');
    await expect(page.getByText('No templates found')).toBeVisible();
    await page.getByLabel('Search templates').fill(name);
    await page.getByRole('button', { name: 'Delete template' }).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect.poll(async () =>
      (await supabase.from('transaction_templates').select('id').eq('name', name)).data?.length
    ).toBe(0);
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

  test('View opens the file through a signed link', async ({ page }) => {
    await openNewTransaction(page);
    await page.locator('input[type="file"]').setInputFiles({ name: 'receipt.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.getByText('Upload complete')).toBeVisible();

    const popup = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'View', exact: true }).click();
    const tab = await popup;
    await expect(tab).toHaveURL(/\/object\/sign\/attachments\//);
    expect((await tab.request.get(tab.url())).ok()).toBe(true);
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

  test('a failed upload does not claim success', async ({ page }) => {
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
  test.afterEach(clearPinLock);

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

    await input.setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
    await expect(page.getByText('Image must be smaller than 10MB')).toBeVisible();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('a damaged image closes the crop dialog with an error', async ({ page }) => {
    await page.goto('/profile');
    await page.locator('input[type="file"]').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
    await expect(page.getByText('Could not read this image')).toBeVisible();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('cancelling the crop uploads nothing', async ({ page }) => {
    let uploads = 0;
    page.on('request', (r) => { if (r.method() !== 'GET' && r.url().includes('/object/avatars/')) uploads++; });

    await page.goto('/profile');
    await page.locator('input[type="file"]').setInputFiles(await tallPhoto(page));
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('dialog')).toBeHidden();
    expect(uploads).toBe(0);
  });

  test('the chosen part of a tall photo becomes a square avatar in the navbar', async ({ page }) => {
    await page.goto('/profile');
    await page.locator('input[type="file"]').setInputFiles(await tallPhoto(page));

    // Dragging up moves the photo up, selecting its blue bottom half.
    const crop = page.getByRole('application');
    await expect(page.getByRole('button', { name: 'Save Photo' })).toBeEnabled();
    await expect(crop.locator('[data-crop-grid] > div')).toHaveCount(4);
    const box = (await crop.boundingBox())!;
    await page.mouse.move(box.x + 140, box.y + 250);
    await page.mouse.down();
    await page.mouse.move(box.x + 140, box.y + 10, { steps: 8 });
    await page.mouse.up();
    await page.getByRole('button', { name: 'Save Photo' }).click();
    await expect(page.getByText('Profile photo updated!')).toBeVisible();

    const navbarImage = page.getByRole('button', { name: 'Account menu' }).locator('img');
    await expect(navbarImage).toBeVisible();

    const pixel = await navbarImage.evaluate(async (img: HTMLImageElement) => {
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const probe = new Image();
      probe.crossOrigin = 'anonymous';
      probe.src = img.src;
      await probe.decode();
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(probe, 0, 0);
      const [r, , b] = ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
      return { width: img.naturalWidth, height: img.naturalHeight, r, b };
    });
    expect(pixel.width).toBe(512);
    expect(pixel.height).toBe(512);
    expect(pixel.b).toBeGreaterThan(pixel.r);

    const { data } = await supabase.auth.getUser();
    await supabase.from('users').update({ avatar: null }).eq('id', data.user!.id);
    await supabase.storage.from('avatars').remove([`${data.user!.id}/avatar.jpg`]);
  });

  // delete-account isn't deployed on the test project, so its answer is mocked.
  test('deleting the account needs the password and reports a wrong one', async ({ page }) => {
    let body: unknown;
    await page.route('**/functions/v1/delete-account', (route) => {
      body = route.request().postDataJSON();
      return route.fulfill({
        status: 403,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: '{"error":"Incorrect password"}',
      });
    });

    await page.goto('/profile');
    await page.getByRole('button', { name: 'Delete Account' }).click();
    const confirm = page.getByRole('button', { name: 'Confirm Delete' });

    await page.locator('#deleteConfirm').fill('DELETE');
    await expect(confirm).toBeDisabled();

    await page.locator('#deletePassword').fill('wrong-password');
    await confirm.click();

    await expect(page.getByText('Incorrect password.')).toBeVisible();
    await expect(page).toHaveURL(/\/profile$/);
    expect(body).toEqual({ password: 'wrong-password' });
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

  test('escapes quotes in a description', async ({ page }) => {
    await insertWithDescription('say "hi", ok');
    expect(await exportCsv(page)).toContain('"say ""hi"", ok"');
  });

  test('neutralises spreadsheet formulas', async ({ page }) => {
    await insertWithDescription('=HYPERLINK("http://example.com")');
    expect(await exportCsv(page)).not.toContain('"=HYPERLINK');
  });

  test('exports descriptions as plain text', async ({ page }) => {
    await insertWithDescription('<p>plain note</p>');
    expect(await exportCsv(page)).not.toContain('<p>plain note</p>');
  });

  test('only exports transactions inside the date range', async ({ page }) => {
    await insertWithDescription('inside the range');
    await addTransaction(page, randomAmount(), 'Income'); // dated today, keeps the later range non-empty
    expect(await exportCsv(page, '2026-01-01', '2026-01-01')).toContain('inside the range');
    expect(await exportCsv(page, '2026-01-02')).not.toContain('inside the range');
  });

  test('blocks the export when the range has no transactions', async ({ page }) => {
    await page.goto('/settings');
    await page.locator('#exportFrom').fill('1999-01-01');
    await page.locator('#exportTo').fill('1999-01-31');
    await expect(page.getByText('No transactions in this range')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export to CSV' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Export to JSON' })).toBeDisabled();
  });
});
