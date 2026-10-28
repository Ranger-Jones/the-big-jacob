-- The first win against a bot is decided by the database alone: the row is created up front and the
-- win is claimed with a single conditional update, so two duels finishing at the same moment can never
-- both count as the first win.
create or replace function public.record_bot_duel(p_user uuid, p_persona text, p_won boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_first boolean := false;
begin
  insert into public.bot_records (user_id, persona) values (p_user, p_persona) on conflict (user_id, persona) do nothing;
  if p_won then
    update public.bot_records set first_win_at = now()
      where user_id = p_user and persona = p_persona and first_win_at is null
      returning true into v_first;
  end if;
  update public.bot_records set
    played = played + 1,
    won = won + case when p_won then 1 else 0 end
    where user_id = p_user and persona = p_persona;
  return coalesce(v_first, false);
end $$;
revoke execute on function public.record_bot_duel(uuid, text, boolean) from public, anon, authenticated;
