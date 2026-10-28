-- Chests from games are capped per (Berlin) day so quick games cannot be farmed for loot.
alter table public.profiles
  add column chest_day date,
  add column chests_today int not null default 0 check (chests_today >= 0);

drop function public.grant_loot_chests(uuid, int);

create function public.grant_loot_chests(p_user uuid, p_count int, p_day date, p_cap int) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_used int;
  v_add int;
begin
  select case when chest_day = p_day then chests_today else 0 end into v_used
    from public.profiles where id = p_user for update;
  if not found then return 0; end if;
  v_add := least(greatest(0, p_count), greatest(0, p_cap - v_used));
  update public.profiles
    set chests = least(999, chests + v_add), chests_today = v_used + v_add, chest_day = p_day
    where id = p_user;
  return v_add;
end $$;

revoke execute on function public.grant_loot_chests(uuid, int, date, int) from public, anon, authenticated;
