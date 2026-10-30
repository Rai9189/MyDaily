-- Run only AFTER the app using verify_pin and set_pin is deployed. Applying this
-- earlier locks every user out, because old clients read and write these columns.

update public.users
set pin_hash = extensions.crypt(pin_hash, extensions.gen_salt('bf', 10))
where pin_hash is not null and pin_hash not like '$2%';

-- Profiles are created by create_user_profile; PIN state changes only through the RPCs.
revoke select, insert, update on public.users from anon, authenticated;

grant select (id, name, email, avatar, pin_type, pin_length, pin_attempts, pin_locked_until,
              has_pin, created_at, updated_at)
  on public.users to authenticated;

grant update (name, avatar) on public.users to authenticated;
