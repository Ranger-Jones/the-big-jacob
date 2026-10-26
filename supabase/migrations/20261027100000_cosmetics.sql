-- Unlockable table felt and avatar frame per player (validated server-side against the stats).
alter table public.profiles add column table_felt text check (table_felt is null or char_length(table_felt) <= 32);
alter table public.profiles add column avatar_frame text check (avatar_frame is null or char_length(avatar_frame) <= 32);

-- Stats view gains the frame (for avatars on the leaderboard) and the newer per-game counters.
drop view public.leaderboard;
drop view public.player_stats;

create view public.player_stats with (security_invoker = true) as
select
  p.id as user_id,
  p.username::text as username,
  p.avatar_url,
  p.avatar_frame,
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
  where g.status = 'finished' and gp.left_game = false
) f on f.user_id = p.id
group by p.id;

create view public.leaderboard with (security_invoker = true) as
select * from public.player_stats where games_played > 0;
