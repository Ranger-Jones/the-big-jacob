-- Game modes: campaign and daily challenge games are solo games against bots and stay out of the
-- normal statistics; friends may watch running games.
alter table public.games add column mode text not null default 'normal' check (mode in ('normal', 'campaign', 'daily'));
alter table public.games add column mode_ref text check (mode_ref is null or char_length(mode_ref) <= 32);
alter table public.profiles add column campaign_level int not null default 0 check (campaign_level between 0 and 100);

-- DAILY CHALLENGE ---------------------------------------------------------
create table public.daily_results (
  day date not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id uuid references public.games (id) on delete set null,
  points int not null,
  place int not null,
  created_at timestamptz not null default now(),
  primary key (day, user_id)
);
alter table public.daily_results enable row level security;
create policy "daily results readable" on public.daily_results for select to authenticated using (true);

-- SPECTATORS --------------------------------------------------------------
create table public.game_spectators (
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (game_id, user_id)
);
alter table public.game_spectators enable row level security;
create policy "own spectating" on public.game_spectators for select to authenticated using (user_id = auth.uid());

create function public.is_game_spectator(gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.game_spectators where game_id = gid and user_id = auth.uid());
$$;

drop policy "games readable" on public.games;
create policy "games readable" on public.games for select to authenticated
  using (
    status = 'finished'
    or public.is_game_member(id)
    or public.is_game_spectator(id)
    or exists (select 1 from public.game_invites i where i.game_id = games.id and i.to_id = auth.uid())
  );

drop policy "players readable" on public.game_players;
create policy "players readable" on public.game_players for select to authenticated
  using (
    public.is_game_member(game_id)
    or public.is_game_spectator(game_id)
    or exists (select 1 from public.games g where g.id = game_players.game_id and g.status = 'finished')
  );

drop policy "chat readable for members" on public.game_messages;
create policy "chat readable for members" on public.game_messages for select to authenticated
  using (public.is_game_member(game_id) or public.is_game_spectator(game_id));

-- Spectators may join the game channel (presence, reactions) as well.
create or replace function public.can_use_game_channel(topic text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  gid uuid;
begin
  if topic is null or topic !~ '^game:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  gid := substring(topic from 6)::uuid;
  return exists (select 1 from public.game_players where game_id = gid and user_id = auth.uid() and not left_game)
    or exists (select 1 from public.game_spectators where game_id = gid and user_id = auth.uid());
end $$;

-- Stats only count normal games.
drop view public.leaderboard;
drop view public.player_stats;

create view public.player_stats with (security_invoker = true) as
select
  p.id as user_id,
  p.username::text as username,
  p.avatar_url,
  p.avatar_frame,
  p.campaign_level,
  count(f.game_id)::int as games_played,
  (count(*) filter (where f.place = 1))::int as wins,
  coalesce(sum(f.points), 0)::int as total_points,
  coalesce(max(f.points), 0)::int as best_points,
  coalesce(round(avg(f.place)::numeric, 1), 0)::float as avg_place,
  coalesce(sum((f.stats ->> 'crowns')::int), 0)::int as crowns,
  coalesce(sum((f.stats ->> 'servant')::int), 0)::int as servant,
  coalesce(sum((f.stats ->> 'revolutions')::int), 0)::int as revolutions,
  coalesce(sum((f.stats ->> 'grandRevolutions')::int), 0)::int as grand_revolutions,
  coalesce(sum((f.stats ->> 'bombs')::int), 0)::int as bombs,
  coalesce(sum((f.stats ->> 'rises')::int), 0)::int as rises,
  coalesce(sum((f.stats ->> 'cardsPlayed')::int), 0)::int as cards_played,
  coalesce(sum((f.stats ->> 'tricks')::int), 0)::int as tricks,
  coalesce(sum((f.stats ->> 'missions')::int), 0)::int as missions
from public.profiles p
left join (
  select gp.* from public.game_players gp
  join public.games g on g.id = gp.game_id
  where g.status = 'finished' and g.mode = 'normal' and gp.left_game = false
) f on f.user_id = p.id
group by p.id;

create view public.leaderboard with (security_invoker = true) as
select * from public.player_stats where games_played > 0;

alter publication supabase_realtime add table public.daily_results;
