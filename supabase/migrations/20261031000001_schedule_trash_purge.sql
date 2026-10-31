-- Trash promises deletion after 30 days, but nothing ever called the purge.
-- Needs migration 20261030000005 and the pg_cron extension.

-- A category can be trashed while live rows still use it. Their RESTRICT foreign
-- keys would fail the whole purge every day, so such a category stays until unused.
create or replace function public.hard_delete_expired_trash()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  delete from transactions where deleted_at < now() - interval '30 days';
  delete from tasks        where deleted_at < now() - interval '30 days';
  delete from notes        where deleted_at < now() - interval '30 days';
  delete from categories c
  where c.deleted_at < now() - interval '30 days'
    and not exists (select 1 from transactions t where t.category_id = c.id)
    and not exists (select 1 from tasks t where t.category_id = c.id)
    and not exists (select 1 from notes n where n.category_id = c.id);
  delete from accounts     where deleted_at < now() - interval '30 days';
end;
$function$;

select public.hard_delete_expired_trash();

select cron.schedule('hard-delete-trash', '0 2 * * *', 'select public.hard_delete_expired_trash()');
