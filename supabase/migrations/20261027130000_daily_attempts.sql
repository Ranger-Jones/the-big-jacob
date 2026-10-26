-- One daily challenge attempt per player and day, enforced by the primary key (no race between requests).
create table public.daily_attempts (
  day date not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (day, user_id)
);
alter table public.daily_attempts enable row level security;
-- No policies: written and read by the server only.
