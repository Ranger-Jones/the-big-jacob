-- One daily challenge attempt per player and day, enforced by the primary key (no race between requests).
create table public.daily_attempts (
  day date not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (day, user_id)
);
alter table public.daily_attempts enable row level security;
-- No policies: written and read by the server only.

-- Daily games started before this table existed count as attempts too.
insert into public.daily_attempts (day, user_id)
select distinct g.mode_ref::date, gp.user_id
from public.games g
join public.game_players gp on gp.game_id = g.id
where g.mode = 'daily' and g.mode_ref ~ '^\d{4}-\d{2}-\d{2}$'
on conflict do nothing;
