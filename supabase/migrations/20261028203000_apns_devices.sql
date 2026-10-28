-- Native iOS push: one row per APNs device token of the app (Web Push stays in push_subscriptions).
create table public.apns_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique check (token ~ '^[0-9a-f]{64,200}$'),
  environment text not null check (environment in ('sandbox', 'production')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index apns_devices_user_idx on public.apns_devices (user_id, updated_at desc);
alter table public.apns_devices enable row level security;
-- No policies: only the server reads and writes device tokens.

-- Registers (or moves, after a different account signed in on the same iPhone) a token and keeps
-- only the p_cap most recently registered devices of the user.
create function public.register_apns_device(p_user uuid, p_token text, p_environment text, p_cap int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.apns_devices (user_id, token, environment)
    values (p_user, p_token, p_environment)
    on conflict (token) do update
      set user_id = excluded.user_id, environment = excluded.environment, updated_at = now();
  delete from public.apns_devices
    where user_id = p_user
      and id not in (
        select id from public.apns_devices where user_id = p_user order by updated_at desc, id limit greatest(1, p_cap)
      );
end $$;

revoke execute on function public.register_apns_device(uuid, text, text, int) from public, anon, authenticated;
