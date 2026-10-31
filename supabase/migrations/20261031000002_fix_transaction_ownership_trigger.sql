-- A foreign key SET NULL also fires this trigger, and it re-checked untouched columns. When both
-- accounts of a transfer went in one delete, the purge failed on the one already gone.
-- Only changed values are checked now, or all of them if the row changes owner.
create or replace function public.enforce_transaction_ownership()
returns trigger
language plpgsql
as $function$
declare
  recheck boolean := tg_op = 'INSERT' or new.user_id is distinct from old.user_id;
begin
  if new.account_id is not null and (recheck or new.account_id is distinct from old.account_id)
     and not exists (select 1 from accounts where id = new.account_id and user_id = new.user_id) then
    raise exception 'Account does not belong to this user';
  end if;
  if new.to_account_id is not null and (recheck or new.to_account_id is distinct from old.to_account_id)
     and not exists (select 1 from accounts where id = new.to_account_id and user_id = new.user_id) then
    raise exception 'Destination account does not belong to this user';
  end if;
  if (recheck or new.category_id is distinct from old.category_id)
     and not exists (select 1 from categories where id = new.category_id and user_id = new.user_id) then
    raise exception 'Category does not belong to this user';
  end if;
  if new.subcategory_id is not null and (recheck or new.subcategory_id is distinct from old.subcategory_id)
     and not exists (select 1 from categories where id = new.subcategory_id and user_id = new.user_id) then
    raise exception 'Subcategory does not belong to this user';
  end if;
  return new;
end;
$function$;
