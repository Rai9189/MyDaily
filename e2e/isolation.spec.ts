import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { signIn, supabase as victim } from './helpers';

// API-level attacks, bypassing the UI. These don't need a page.
const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, E2E_PASSWORD } = process.env as Record<string, string>;
const client = () => createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

const anon = client();
const attacker = client();
const ATTACKER = { email: 'e2e-attacker@example.com', password: E2E_PASSWORD };

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

let victimId: string;
let attackerId: string;
let victimAccountId: string;
let victimCategoryId: string;

test.beforeAll(async () => {
  const { data } = await signIn();
  victimId = data.user!.id;

  const signedIn = await attacker.auth.signInWithPassword(ATTACKER);
  if (signedIn.error) {
    const { data: created, error } = await attacker.auth.signUp(ATTACKER);
    if (error) throw error;
    await attacker.rpc('create_user_profile', {
      user_id: created.user!.id, user_name: 'Attacker', user_email: ATTACKER.email,
    });
  }
  attackerId = (await attacker.auth.getUser()).data.user!.id;

  const account = await victim.from('accounts').select('id').eq('name', 'E2E Bank').single();
  victimAccountId = account.data!.id;
  const category = await victim.from('categories').select('id').eq('name', 'E2E Income').single();
  victimCategoryId = category.data!.id;
});

test.describe('another signed-in user', () => {
  for (const table of ['accounts', 'categories', 'transactions', 'activity_logs']) {
    test(`cannot read the victim's ${table}`, async () => {
      const { data } = await attacker.from(table).select('id').eq('user_id', victimId);
      expect(data).toEqual([]);
    });
  }

  test("cannot read the victim's profile or PIN hash", async () => {
    const { data } = await attacker.from('users').select('pin_hash').eq('id', victimId);
    expect(data).toEqual([]);
  });

  test("cannot change the victim's balance directly", async () => {
    const before = await victim.from('accounts').select('balance').eq('id', victimAccountId).single();
    await attacker.from('accounts').update({ balance: 1 }).eq('id', victimAccountId);
    const after = await victim.from('accounts').select('balance').eq('id', victimAccountId).single();
    expect(after.data).toEqual(before.data);
  });

  test("cannot delete the victim's category", async () => {
    await attacker.from('categories').delete().eq('id', victimCategoryId);
    const { data } = await victim.from('categories').select('id').eq('id', victimCategoryId);
    expect(data).toHaveLength(1);
  });

  test('cannot create a transaction owned by the victim', async () => {
    const { error } = await attacker.from('transactions').insert({
      user_id: victimId, account_id: victimAccountId, category_id: victimCategoryId,
      amount: 1, type: 'income', date: '2026-01-01',
    });
    expect(error).not.toBeNull();
  });

  // BUG: the balance is safe, but the row is stored against another user's account (no ownership check on account_id).
  test.fail("cannot attach their own transaction to the victim's account", async () => {
    const { data: category } = await attacker.from('categories').select('id').limit(1).single();
    const before = await victim.from('accounts').select('balance').eq('id', victimAccountId).single();

    const { error } = await attacker.from('transactions').insert({
      user_id: attackerId, account_id: victimAccountId, category_id: category!.id,
      amount: 1, type: 'income', date: '2026-01-01',
    });

    const after = await victim.from('accounts').select('balance').eq('id', victimAccountId).single();
    expect(after.data).toEqual(before.data);
    expect(error).not.toBeNull();
  });

  // BUG: reset_category_order is SECURITY DEFINER and trusts p_user_id.
  test.fail("cannot reorder the victim's categories", async () => {
    await victim.from('categories').update({ sort_order: 999 }).eq('id', victimCategoryId);
    await attacker.rpc('reset_category_order', { p_user_id: victimId, p_type: 'transaction' });
    const { data } = await victim.from('categories').select('sort_order').eq('id', victimCategoryId).single();
    expect(data!.sort_order).toBe(999);
  });

  test("cannot upload into the victim's storage folder", async () => {
    const { error } = await attacker.storage
      .from('attachments')
      .upload(`${victimId}/attacker.png`, PNG, { contentType: 'image/png' });
    expect(error).not.toBeNull();
  });
});

test.describe('signed-out visitor', () => {
  test('cannot read any data', async () => {
    for (const table of ['accounts', 'transactions', 'users', 'notes']) {
      const { data } = await anon.from(table).select('id');
      expect(data ?? []).toEqual([]);
    }
  });

  // BUG: hard_delete_expired_trash is executable by anon.
  test.fail('cannot run the trash purge', async () => {
    const { error } = await anon.rpc('hard_delete_expired_trash');
    expect(error).not.toBeNull();
  });

  // BUG: reset_category_order is executable by anon.
  test.fail("cannot reorder a user's categories", async () => {
    const { error } = await anon.rpc('reset_category_order', { p_user_id: victimId, p_type: 'transaction' });
    expect(error).not.toBeNull();
  });

  // BUG: the attachments bucket is public, so receipts open without logging in.
  test.fail('cannot open an uploaded attachment by URL', async () => {
    const path = `${victimId}/public-check.png`;
    await victim.storage.from('attachments').upload(path, PNG, { contentType: 'image/png', upsert: true });
    const url = victim.storage.from('attachments').getPublicUrl(path).data.publicUrl;

    const response = await fetch(url);
    await victim.storage.from('attachments').remove([path]);

    expect(response.ok).toBe(false);
  });
});

test.describe('server-side validation', () => {
  // BUG: no CHECK (amount > 0); a negative expense raises the balance.
  test.fail('rejects a negative amount', async () => {
    const { data: category } = await attacker.from('categories').select('id').limit(1).single();
    const { data: account } = await attacker
      .from('accounts')
      .upsert({ id: attackerId, user_id: attackerId, name: 'Attacker Bank', type: 'Bank', balance: 0 })
      .select('id')
      .single();

    const { error } = await attacker.from('transactions').insert({
      user_id: attackerId, account_id: account!.id, category_id: category!.id,
      amount: -1000, type: 'expense', date: '2026-01-01',
    });
    expect(error).not.toBeNull();
  });

  // BUG: file type and size are only checked in the browser.
  test.fail('rejects uploading an HTML file', async () => {
    const path = `${attackerId}/page.html`;
    const { error } = await attacker.storage
      .from('attachments')
      .upload(path, '<script>alert(1)</script>', { contentType: 'text/html', upsert: true });
    await attacker.storage.from('attachments').remove([path]);
    expect(error).not.toBeNull();
  });
});
