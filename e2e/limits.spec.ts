import { test, expect } from '@playwright/test';
import { addTransaction, balanceOf, randomAmount, signIn, skipPinLock, supabase } from './helpers';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';
const XSS = '<img src=x onerror="window.__xss=1"><script>window.__xss=1</script>';

const ROUTES = [
  '/', '/accounts', '/transactions', '/transactions/new', '/transactions/import',
  '/tasks', '/tasks/new', '/notes', '/notes/new', '/profile', '/settings', '/categories', '/trash',
];

async function testRowIds() {
  const { data: user } = await supabase.auth.getUser();
  const account = await supabase.from('accounts').select('id').eq('name', 'E2E Bank').single();
  const category = await supabase.from('categories').select('id').eq('name', 'E2E Income').single();
  return { user_id: user.user!.id, account_id: account.data!.id, category_id: category.data!.id };
}

test.beforeAll(() => signIn());
test.beforeEach(({ page }) => skipPinLock(page));

test.describe('amount input', () => {
  test.beforeEach(({ page }) => page.goto('/transactions/new'));

  test('caps at one billion', async ({ page }) => {
    await page.locator('#amount').fill('1000000001');
    await expect(page.getByText('Maximum amount is Rp 1.000.000.000')).toBeVisible();
    await expect(page.locator('#amount')).toHaveValue('1.000.000.000');
  });

  test('ignores letters and symbols', async ({ page }) => {
    await page.locator('#amount').fill('abc$%^');
    await expect(page.locator('#amount')).toHaveValue('');
  });

  test('zero cannot be saved', async ({ page }) => {
    await page.locator('#amount').fill('0');
    await page.getByRole('button', { name: 'Save Transaction' }).click();
    await expect(page.getByText('Please enter a valid amount.')).toBeVisible();
    await expect(page).toHaveURL(/\/transactions\/new/);
  });
});

test('keeps decimal amounts exact', async ({ page }) => {
  const before = await balanceOf('E2E Bank');
  await addTransaction(page, '1500,75', 'Income');
  await expect.poll(async () => (await balanceOf('E2E Bank')) - before).toBeCloseTo(1500.75, 2);
});

test('double-clicking save creates one transaction', async ({ page }) => {
  const amount = randomAmount();
  await page.goto('/transactions/new');
  await page.locator('#amount').fill(String(amount));
  await page.locator('#type').click();
  await page.getByRole('option', { name: 'Income' }).click();
  await page.locator('#category').click();
  await page.getByRole('option', { name: 'E2E Income' }).click();
  await page.getByRole('button', { name: 'Save Transaction' }).dblclick();
  await expect(page).toHaveURL(/\/transactions$/);
  await page.waitForTimeout(1_000);

  const { data } = await supabase.from('transactions').select('id').eq('amount', amount);
  expect(data).toHaveLength(1);
});

test('concurrent transactions all reach the balance', async () => {
  const ids = await testRowIds();
  const before = await balanceOf('E2E Bank');

  await Promise.all(Array.from({ length: 10 }, () =>
    supabase.from('transactions').insert({ ...ids, amount: 1_000, type: 'income', date: '2026-01-01' }),
  ));

  await expect.poll(() => balanceOf('E2E Bank')).toBe(before + 10_000);
});

test('description stops at the 10,000 character limit', async ({ page }) => {
  await page.goto('/transactions/new');
  await page.locator('.ProseMirror').fill('x'.repeat(10_001));
  await expect(page.getByText('10.001/10.000')).toBeHidden();
});

test('emoji and non-Latin text survive saving', async ({ page }) => {
  const amount = randomAmount();
  const text = 'Kopi ☕🎉 日本語 العربية';
  await page.goto('/transactions/new');
  await page.locator('#amount').fill(String(amount));
  await page.locator('#type').click();
  await page.getByRole('option', { name: 'Income' }).click();
  await page.locator('#category').click();
  await page.getByRole('option', { name: 'E2E Income' }).click();
  await page.locator('.ProseMirror').fill(text);
  await page.getByRole('button', { name: 'Save Transaction' }).click();
  await expect(page).toHaveURL(/\/transactions$/);

  const { data } = await supabase.from('transactions').select('description').eq('amount', amount).single();
  expect(data!.description).toContain(text);
});

test.describe('stored XSS', () => {
  test('script in a transaction description does not run', async ({ page }) => {
    const { data } = await supabase
      .from('transactions')
      .insert({ ...(await testRowIds()), amount: randomAmount(), type: 'income', date: '2026-01-01', description: XSS })
      .select('id')
      .single();

    for (const route of [`/transactions/${data!.id}`, '/transactions', '/']) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
    }
  });

  test('script in a note does not run', async ({ page }) => {
    const { user_id } = await testRowIds();
    const { data: category } = await supabase.from('categories').select('id').eq('type', 'note').limit(1).single();
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id, category_id: category!.id, title: XSS.slice(0, 100), content: XSS })
      .select('id')
      .single();
    if (error) throw error;

    for (const route of [`/notes/${data!.id}`, '/notes']) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
    }
  });
});

test.describe('bad URLs', () => {
  for (const id of [NIL_UUID, 'not-a-uuid', '../../etc/passwd', '%00', "1' OR '1'='1"]) {
    test(`unknown transaction id ${id} shows not found`, async ({ page }) => {
      await page.goto(`/transactions/${encodeURIComponent(id)}`);
      await expect(page.getByText('Transaction not found')).toBeVisible();
    });
  }

  test('unknown note id shows not found', async ({ page }) => {
    await page.goto(`/notes/${NIL_UUID}`);
    await expect(page.getByText(/not found/i)).toBeVisible();
  });

  // BUG: TaskDetail has no not-found state, so a bad id opens an empty edit form.
  test.fail('unknown task id shows not found', async ({ page }) => {
    await page.goto(`/tasks/${NIL_UUID}`);
    await expect(page.getByText(/not found/i)).toBeVisible();
  });

  test('unknown routes go to the dashboard', async ({ page }) => {
    await page.goto('/this/does/not/exist');
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('broken sessions', () => {
  test('clearing storage signs the user out', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page).toHaveURL(/\/login/);
  });

  test('a corrupted session token signs the user out instead of crashing', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('sb-')) localStorage.setItem(key, '{not json');
      }
    });
    await page.reload();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('every page', () => {
  for (const route of ROUTES) {
    test(`${route} renders in dark mode without errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript(() => localStorage.setItem('theme', 'dark'));

      await page.goto(route);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('html')).toHaveClass(/dark/);
      expect(errors).toEqual([]);
    });
  }
});

test.describe('every page on a phone', () => {
  test.use({ viewport: { width: 360, height: 640 } });

  for (const route of ROUTES) {
    test(`${route} has no horizontal overflow`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
