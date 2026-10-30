-- Run BEFORE deploying the app that calls verify_pin and set_pin.
-- Old clients keep working: nothing is revoked here, and verify_pin accepts both
-- the legacy SHA-256 hash and bcrypt, upgrading on the first correct PIN.

alter table public.users
  add column has_pin boolean generated always as (pin_hash is not null) stored,
  add column pin_verified_at timestamptz;

create or replace function public.verify_pin(p_pin_hash text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_user users%rowtype;
  v_attempts integer;
  v_locked_until timestamptz;
  v_max_attempts constant integer := 5;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_user from users where id = auth.uid() for update;

  if v_user.pin_hash is null then
    return jsonb_build_object('success', false, 'no_pin', true);
  end if;

  if v_user.pin_locked_until > now() then
    return jsonb_build_object('success', false, 'locked', true, 'locked_until', v_user.pin_locked_until);
  end if;

  if (case when v_user.pin_hash like '$2%'
           then v_user.pin_hash = crypt(p_pin_hash, v_user.pin_hash)
           else v_user.pin_hash = p_pin_hash end) then
    update users
    set pin_hash = case when pin_hash like '$2%' then pin_hash else crypt(p_pin_hash, gen_salt('bf', 10)) end,
        pin_attempts = 0,
        pin_locked_until = null,
        pin_verified_at = now()
    where id = auth.uid();
    return jsonb_build_object('success', true);
  end if;

  -- An expired lockout starts a new round of attempts.
  v_attempts := case when v_user.pin_locked_until is null then coalesce(v_user.pin_attempts, 0) else 0 end + 1;
  v_locked_until := case when v_attempts >= v_max_attempts then now() + interval '30 seconds' end;

  update users
  set pin_attempts = v_attempts, pin_locked_until = v_locked_until
  where id = auth.uid();

  return jsonb_build_object(
    'success', false,
    'locked', v_locked_until is not null,
    'locked_until', v_locked_until,
    'attempts', v_attempts,
    'attempts_left', v_max_attempts - v_attempts
  );
end;
$function$;

-- Replacing a PIN needs proof: no PIN yet, the current PIN just entered, or a fresh
-- password login (the "Forgot my PIN" flow). Otherwise this would skip the lockout.
create or replace function public.set_pin(p_pin_hash text, p_pin_type text, p_pin_length integer)
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_user users%rowtype;
  v_last_sign_in timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_user from users where id = auth.uid() for update;
  select last_sign_in_at into v_last_sign_in from auth.users where id = auth.uid();

  if v_user.pin_hash is not null
     and coalesce(v_user.pin_verified_at, '-infinity') < now() - interval '5 minutes'
     and coalesce(v_last_sign_in, '-infinity') < now() - interval '5 minutes' then
    raise exception 'Verify your PIN or password first';
  end if;

  update users
  set pin_hash = crypt(p_pin_hash, gen_salt('bf', 10)),
      pin_type = p_pin_type,
      pin_length = p_pin_length,
      pin_attempts = 0,
      pin_locked_until = null,
      pin_verified_at = null
  where id = auth.uid();
end;
$function$;

revoke execute on function public.verify_pin(text) from public, anon;
revoke execute on function public.set_pin(text, text, integer) from public, anon;
grant execute on function public.verify_pin(text) to authenticated;
grant execute on function public.set_pin(text, text, integer) to authenticated;
