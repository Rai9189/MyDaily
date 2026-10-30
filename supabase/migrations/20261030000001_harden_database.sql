-- The trash purge must never be callable through the API.
revoke execute on function public.hard_delete_expired_trash() from public, anon, authenticated;

-- reset_category_order runs as definer, so it has to check the caller itself.
create or replace function public.reset_category_order(p_user_id uuid, p_type text, p_parent_id uuid default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'Not allowed';
  end if;

  update categories c
  set sort_order = sub.rn
  from (
    select id, row_number() over (order by created_at asc) as rn
    from categories
    where user_id = p_user_id
      and type = p_type
      and deleted_at is null
      and (
        case
          when p_parent_id is null then parent_id is null
          else parent_id = p_parent_id
        end
      )
  ) sub
  where c.id = sub.id;
end;
$function$;

revoke execute on function public.reset_category_order(uuid, text, uuid) from public, anon;
grant execute on function public.reset_category_order(uuid, text, uuid) to authenticated;

-- A negative expense would otherwise raise the balance.
alter table public.transactions
  add constraint transactions_amount_positive check (amount > 0);

-- Runs as the caller on purpose: RLS hides other users' rows, so they fail the check.
create or replace function public.enforce_transaction_ownership()
returns trigger
language plpgsql
as $function$
begin
  if new.account_id is not null
     and not exists (select 1 from accounts where id = new.account_id and user_id = new.user_id) then
    raise exception 'Account does not belong to this user';
  end if;
  if new.to_account_id is not null
     and not exists (select 1 from accounts where id = new.to_account_id and user_id = new.user_id) then
    raise exception 'Destination account does not belong to this user';
  end if;
  if not exists (select 1 from categories where id = new.category_id and user_id = new.user_id) then
    raise exception 'Category does not belong to this user';
  end if;
  if new.subcategory_id is not null
     and not exists (select 1 from categories where id = new.subcategory_id and user_id = new.user_id) then
    raise exception 'Subcategory does not belong to this user';
  end if;
  return new;
end;
$function$;

create trigger trigger_enforce_transaction_ownership
  before insert or update of user_id, account_id, to_account_id, category_id, subcategory_id
  on public.transactions
  for each row execute function public.enforce_transaction_ownership();

-- Same limits as uploadFile() and Profile.tsx, enforced by the server.
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
where id = 'attachments';

update storage.buckets
set file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
where id = 'avatars';
