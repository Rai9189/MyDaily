-- The foreign key is ON DELETE SET NULL and the app shows such rows as "Deleted Account",
-- but NOT NULL made every delete of an account with transactions fail. That also broke
-- hard_delete_expired_trash and account deletion. Safe to run before the app deploy.
alter table public.transactions alter column account_id drop not null;
