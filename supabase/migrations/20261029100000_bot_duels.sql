-- Duels against the persona bots ("Gegen Bots spielen") and each player's record against every bot.

alter table public.games drop constraint if exists games_mode_check;
alter table public.games add constraint games_mode_check check (mode in ('normal', 'campaign', 'daily', 'public', 'duel'));

create table public.bot_records (
  user_id uuid not null references public.profiles (id) on delete cascade,
  persona text not null check (char_length(persona) between 1 and 32),
  played int not null default 0 check (played >= 0),
  won int not null default 0 check (won >= 0),
  first_win_at timestamptz,
  primary key (user_id, persona)
);
alter table public.bot_records enable row level security;
create policy "bot records are private" on public.bot_records for select using (auth.uid() = user_id);

-- Books one finished duel; only the server (service role) calls it.
create function public.record_bot_duel(p_user uuid, p_persona text, p_won boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.bot_records (user_id, persona, played, won, first_win_at)
  values (p_user, p_persona, 1, case when p_won then 1 else 0 end, case when p_won then now() end)
  on conflict (user_id, persona) do update set
    played = public.bot_records.played + 1,
    won = public.bot_records.won + case when p_won then 1 else 0 end,
    first_win_at = coalesce(public.bot_records.first_win_at, case when p_won then now() end);
end $$;
revoke execute on function public.record_bot_duel(uuid, text, boolean) from public, anon, authenticated;
