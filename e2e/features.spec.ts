import { test, expect, type Page } from '@playwright/test';
import { addTransaction, randomAmount, signIn, skipPinLock, supabase } from './helpers';

test.beforeAll(() => signIn());
test.beforeEach(({ page }) => skipPinLock(page));

const unique = (prefix: string) => `${prefix} ${Math.random().toString(36).slice(2, 8)}`;

async function restoreFromTrash(page: Page, name: string) {
  await page.goto('/trash');
  const row = page.locator('.divide-y > div').filter({ hasText: name });
  await expect(row).toBeVisible();
  await row.locator('button:has(.lucide-rotate-ccw)').click();
  await expect(row).toBeHidden();
}

async function deletedAt(table: string, column: string, value: string) {
  const { data } = await supabase.from(table).select('deleted_at').eq(column, value).single();
  return data?.deleted_at;
}

async function createTask(page: Page, title: string) {
  await page.goto('/tasks/new');
  await page.locator('#title').fill(title);
  await page.locator('#deadline').fill('2030-01-01');
  await page.locator('#category').click();
  await page.getByRole('option').first().click();
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText('Task saved!')).toBeVisible();
  await expect(page).toHaveURL(/\/tasks$/);
}

async function createNote(page: Page, title: string, content: string) {
  await page.goto('/notes/new');
  await page.locator('#title').fill(title);
  await page.locator('#category').click();
  await page.getByRole('option').first().click();
  await page.locator('.ProseMirror').fill(content);
  await page.getByRole('button', { name: 'Save Note' }).click();
  await expect(page.getByText('Note saved!')).toBeVisible();
}

test.describe('tasks', () => {
  test('create, complete and reopen', async ({ page }) => {
    const title = unique('Task');
    await createTask(page, title);

    await page.getByPlaceholder('Search tasks...').fill(title);
    await page.getByText(title).click();
    await page.getByRole('button', { name: 'Mark as Done' }).click();
    // The confirm dialog renders before the page's own button.
    await page.getByRole('button', { name: 'Mark as Done' }).first().click();
    await expect(page.getByText('Task completed!')).toBeVisible();

    const completed = async () =>
      (await supabase.from('tasks').select('completed').eq('title', title).single()).data!.completed;
    await expect.poll(completed).toBe(true);

    await page.getByRole('button', { name: /Unsubmit|Reopen/ }).click();
    await page.getByRole('button', { name: 'Unsubmit' }).first().click();
    await expect(page.getByText('Task reopened!')).toBeVisible();
    await expect.poll(completed).toBe(false);
  });

  test('delete and restore', async ({ page }) => {
    const title = unique('Task');
    await createTask(page, title);

    await page.getByPlaceholder('Search tasks...').fill(title);
    await page.locator('button:has(.lucide-trash-2)').first().click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('Task deleted')).toBeVisible();
    await expect.poll(() => deletedAt('tasks', 'title', title)).toBeTruthy();

    await restoreFromTrash(page, title);
    await expect.poll(() => deletedAt('tasks', 'title', title)).toBeNull();
  });

  test('title stops at 100 characters', async ({ page }) => {
    await page.goto('/tasks/new');
    await page.locator('#title').fill('x'.repeat(150));
    await expect(page.locator('#title')).toHaveValue('x'.repeat(100));
  });
});

test.describe('notes', () => {
  test('create and edit', async ({ page }) => {
    const title = unique('Note');
    await createNote(page, title, 'first version');

    await page.goto('/notes');
    await page.getByPlaceholder('Search by title or content...').fill(title);
    await page.getByText(title).first().click();
    await page.locator('.ProseMirror').fill('second version');
    await page.getByRole('button', { name: 'Update Note' }).click();
    await expect(page.getByText('Note updated!')).toBeVisible();

    const { data } = await supabase.from('notes').select('content').eq('title', title).single();
    expect(data!.content).toContain('second version');
  });

  test('a locked note hides its title and content in the list and Trash', async ({ page }) => {
    const title = unique('Secret');
    const content = unique('classified');
    await createNote(page, title, content);

    await page.goto('/notes');
    await page.getByText(title).first().click();
    await page.getByRole('button', { name: 'Lock', exact: true }).click();
    await expect(page.getByText('Note locked')).toBeVisible();

    await page.goto('/notes');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(title)).toBeHidden();
    await expect(page.getByText(content)).toBeHidden();

    await supabase.from('notes').update({ deleted_at: new Date().toISOString() }).eq('title', title);
    await page.goto('/trash');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(title)).toBeHidden();
    await expect(page.getByText('Locked note').first()).toBeVisible();
  });
});

test.describe('accounts', () => {
  test('create and delete', async ({ page }) => {
    const name = unique('Wallet');

    await page.goto('/accounts');
    await page.getByRole('button', { name: 'Add Account' }).click();
    await page.locator('#name').fill(name);
    await page.locator('#balance').fill('250000');
    await page.getByRole('dialog').locator('button[type="submit"]').click();
    await expect(page.getByText('Account created!')).toBeVisible();

    const { data } = await supabase.from('accounts').select('balance').eq('name', name).single();
    expect(Number(data!.balance)).toBe(250_000);

    const card = page.locator('div').filter({ hasText: name }).filter({ has: page.locator('.lucide-trash-2') }).last();
    await card.locator('button:has(.lucide-trash-2)').click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('Account deleted')).toBeVisible();
    await expect.poll(() => deletedAt('accounts', 'name', name)).toBeTruthy();
  });

  test('balance above one billion is capped', async ({ page }) => {
    await page.goto('/accounts');
    await page.getByRole('button', { name: 'Add Account' }).click();
    await page.locator('#balance').fill('2000000000');
    await expect(page.locator('#balance')).toHaveValue('1.000.000.000');
  });
});

test.describe('categories', () => {
  test('create', async ({ page }) => {
    const name = unique('Cat');

    await page.goto('/categories');
    await page.getByRole('button', { name: 'Add Category' }).first().click();
    await page.locator('#name').fill(name);
    await page.getByRole('dialog').getByRole('button', { name: 'Income' }).click();
    await page.getByRole('dialog').locator('button[type="submit"]').click();
    await expect(page.getByText('Category created!')).toBeVisible();

    const { data } = await supabase.from('categories').select('id').eq('name', name);
    expect(data).toHaveLength(1);
  });

  test('deleting a category in use keeps its transactions readable', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const amount = randomAmount();
    await addTransaction(page, amount, 'Income');

    const { data } = await supabase.from('transactions').select('category_id').eq('amount', amount).single();
    const { data: user } = await supabase.auth.getUser();
    const { data: temp } = await supabase
      .from('categories')
      .insert({ user_id: user.user!.id, name: unique('Temp'), type: 'transaction', subtype: 'income', color: '#000000' })
      .select('id')
      .single();
    await supabase.from('transactions').update({ category_id: temp!.id }).eq('amount', amount);
    await supabase.from('categories').update({ deleted_at: new Date().toISOString() }).eq('id', temp!.id);

    await page.goto('/transactions');
    await page.getByPlaceholder('Search transactions...').fill(String(amount));
    await expect(page.getByRole('row').filter({ hasText: new Intl.NumberFormat('id-ID').format(amount) })).toBeVisible();
    expect(errors).toEqual([]);

    await supabase.from('transactions').update({ category_id: data!.category_id }).eq('amount', amount);
  });
});
