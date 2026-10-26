-- Elo rating, experience levels and the public matchmaking lobby.

-- PUBLIC GAMES ---------------------------------------------------------------
alter table public.games drop constraint if exists games_mode_check;
alter table public.games add constraint games_mode_check check (mode in ('normal', 'campaign', 'daily', 'public'));
create index if not exists games_public_lobby_idx on public.games (created_at) where mode = 'public' and status = 'lobby';

-- RATING & XP ------------------------------------------------------------------
alter table public.profiles
  add column rating int not null default 1000,
  add column peak_rating int not null default 1000,
  add column rated_games int not null default 0,
  add column xp int not null default 0;

-- One row per player and finished game: Elo change and experience earned (also the idempotency key).
create table public.rating_history (
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rated boolean not null,
  rating_before int not null,
  rating_after int not null,
  delta int not null,
  xp int not null check (xp >= 0),
  place int,
  players int not null,
  created_at timestamptz not null default now(),
  primary key (game_id, user_id)
);
create index rating_history_user_idx on public.rating_history (user_id, created_at desc);

alter table public.rating_history enable row level security;
create policy "rating history readable" on public.rating_history for select to authenticated using (true);

/*
 * Books the result of a finished game: entries = [{ userId, delta, xp, place, players, rated }].
 * Each player is booked at most once per game; rating changes are applied as increments so two games
 * finishing at the same time cannot overwrite each other.
 */
create function public.apply_game_results(p_game_id uuid, p_entries jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  e jsonb;
  v_user uuid;
  v_delta int;
  v_xp int;
  v_rated boolean;
  v_before int;
begin
  for e in select * from jsonb_array_elements(p_entries) loop
    v_user := (e ->> 'userId')::uuid;
    v_rated := coalesce((e ->> 'rated')::boolean, false);
    v_delta := case when v_rated then coalesce((e ->> 'delta')::int, 0) else 0 end;
    v_xp := greatest(coalesce((e ->> 'xp')::int, 0), 0);

    select rating into v_before from public.profiles where id = v_user for update;
    if v_before is null then
      continue;
    end if;

    insert into public.rating_history (game_id, user_id, rated, rating_before, rating_after, delta, xp, place, players)
    values (p_game_id, v_user, v_rated, v_before, greatest(v_before + v_delta, 100), greatest(v_before + v_delta, 100) - v_before,
            v_xp, (e ->> 'place')::int, coalesce((e ->> 'players')::int, 0))
    on conflict (game_id, user_id) do nothing;

    if found then
      update public.profiles set
        rating = greatest(rating + v_delta, 100),
        peak_rating = greatest(peak_rating, greatest(rating + v_delta, 100)),
        rated_games = rated_games + case when v_rated then 1 else 0 end,
        xp = xp + v_xp
      where id = v_user;
    end if;
  end loop;
end $$;

revoke execute on function public.apply_game_results(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.apply_game_results(uuid, jsonb) to service_role;

-- STATS ------------------------------------------------------------------------
-- Public games count like normal games; the leaderboard also carries rating and experience.
drop view public.leaderboard;
drop view public.player_stats;

create view public.player_stats with (security_invoker = true) as
select
  p.id as user_id,
  p.username::text as username,
  p.avatar_url,
  p.avatar_frame,
  p.campaign_level,
  p.rating,
  p.peak_rating,
  p.rated_games,
  p.xp,
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
  where g.status = 'finished' and g.mode in ('normal', 'public') and gp.left_game = false
) f on f.user_id = p.id
group by p.id;

create view public.leaderboard with (security_invoker = true) as
select * from public.player_stats where games_played > 0 or rated_games > 0;
