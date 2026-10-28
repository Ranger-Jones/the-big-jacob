-- More ways to earn Dukaten: the daily challenge, new campaign stations and the first win against each bot.

-- Adds Dukaten (rewards); only the server (service role) calls it.
create function public.grant_dukaten(p_user uuid, p_amount int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set dukaten = least(1000000, dukaten + greatest(0, p_amount)) where id = p_user;
end $$;
revoke execute on function public.grant_dukaten(uuid, int) from public, anon, authenticated;

-- Books one finished duel and tells whether it was the first win against this bot (for its reward).
drop function public.record_bot_duel(uuid, text, boolean);
create function public.record_bot_duel(p_user uuid, p_persona text, p_won boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_first boolean;
begin
  select coalesce(won, 0) = 0 into v_first from public.bot_records where user_id = p_user and persona = p_persona for update;
  v_first := coalesce(v_first, true) and p_won;
  insert into public.bot_records (user_id, persona, played, won, first_win_at)
  values (p_user, p_persona, 1, case when p_won then 1 else 0 end, case when p_won then now() end)
  on conflict (user_id, persona) do update set
    played = public.bot_records.played + 1,
    won = public.bot_records.won + case when p_won then 1 else 0 end,
    first_win_at = coalesce(public.bot_records.first_win_at, case when p_won then now() end);
  return v_first;
end $$;
revoke execute on function public.record_bot_duel(uuid, text, boolean) from public, anon, authenticated;
