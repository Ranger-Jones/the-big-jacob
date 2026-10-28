-- Campaign: one newly conquered station per day (replaying won stations stays open).
alter table public.profiles add column campaign_won_on date;

-- Loot chests ("Truhen"): cosmetic items in four rarities. Chests are earned by playing; duplicates turn into Dukaten.
alter table public.profiles
  add column chests int not null default 3 check (chests between 0 and 999),
  add column dukaten int not null default 0 check (dukaten between 0 and 1000000),
  add column loot_equipped jsonb not null default '{}'::jsonb;

create table public.loot_items (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null check (char_length(item_id) between 1 and 64),
  count int not null default 1 check (count >= 1),
  first_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
alter table public.loot_items enable row level security;
create policy "own loot readable" on public.loot_items for select to authenticated using (user_id = auth.uid());

-- Opening a chest spends exactly one chest and books the drawn item atomically (no double spending).
create function public.open_loot_chest(p_user uuid, p_item text, p_dupe_dukaten int) returns int
language plpgsql security definer set search_path = '' as $$
declare v_count int;
begin
  update public.profiles set chests = chests - 1 where id = p_user and chests > 0;
  if not found then raise exception 'no_chests'; end if;
  insert into public.loot_items (user_id, item_id) values (p_user, p_item)
    on conflict (user_id, item_id) do update set count = public.loot_items.count + 1
    returning count into v_count;
  if v_count > 1 then
    update public.profiles set dukaten = dukaten + p_dupe_dukaten where id = p_user;
  end if;
  return v_count;
end $$;

create function public.buy_loot_chest(p_user uuid, p_cost int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set dukaten = dukaten - p_cost, chests = least(999, chests + 1)
    where id = p_user and dukaten >= p_cost;
  if not found then raise exception 'not_enough_dukaten'; end if;
end $$;

create function public.grant_loot_chests(p_user uuid, p_count int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set chests = least(999, chests + greatest(0, p_count)) where id = p_user;
end $$;

-- Only the server (service role) may call these.
revoke execute on function public.open_loot_chest(uuid, text, int) from public, anon, authenticated;
revoke execute on function public.buy_loot_chest(uuid, int) from public, anon, authenticated;
revoke execute on function public.grant_loot_chests(uuid, int) from public, anon, authenticated;
