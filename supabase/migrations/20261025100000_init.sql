create extension if not exists citext with schema extensions;

-- PROFILES -----------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username extensions.citext not null unique
    check (username::text ~ '^[A-Za-z0-9_]{3,20}$'),
  avatar_url text,
  quick_emojis text[],
  -- Deck brought to new games: a custom deck uuid or a preset id like 'preset:hofstaat'.
  default_deck text check (default_deck is null or char_length(default_deck) <= 64),
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username) values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- FRIENDSHIPS --------------------------------------------------------------
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);
create unique index friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

-- DECKS --------------------------------------------------------------------
create table public.decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  design jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index decks_owner_idx on public.decks (owner_id);

-- GAMES --------------------------------------------------------------------
create table public.games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  host_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  -- Public part of the game state only. Hands live in game_secrets / game_hands.
  state jsonb not null,
  version int not null default 0,
  rematch_game_id uuid references public.games (id) on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index games_status_idx on public.games (status);

-- Server-only: every hand (including bots) and private tax notes.
create table public.game_secrets (
  game_id uuid primary key references public.games (id) on delete cascade,
  data jsonb not null default '{}'::jsonb
);

create table public.game_players (
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  seat int not null,
  left_game boolean not null default false,
  points int not null default 0,
  place int,
  stats jsonb not null default '{}'::jsonb,
  joined_at timestamptz not null default now(),
  primary key (game_id, user_id)
);
create index game_players_user_idx on public.game_players (user_id);

-- Each human's own hand, mirrored for the client (RLS: only the owner can read it).
create table public.game_hands (
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  hand jsonb not null default '{"cards":[],"received":[],"gave":[]}'::jsonb,
  version int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

create table public.game_invites (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (game_id, to_id)
);
create index game_invites_to_idx on public.game_invites (to_id, status);

create table public.game_messages (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
create index game_messages_game_idx on public.game_messages (game_id, created_at);

-- HELPERS ------------------------------------------------------------------
create function public.is_game_member(gid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.game_players where game_id = gid and user_id = auth.uid());
$$;

/*
 * Writes a game atomically with optimistic locking:
 * public state, server secrets, player rows and the changed human hands.
 * A game without human players is deleted (version-checked as well).
 */
create function public.commit_game(
  p_game_id uuid, p_expected_version int, p_state jsonb, p_secret jsonb, p_players jsonb, p_hands jsonb
) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_status text := p_state ->> 'status';
  v_version int;
begin
  if jsonb_array_length(p_players) = 0 then
    delete from public.games where id = p_game_id and version = p_expected_version;
    if not found then
      raise exception 'version_conflict';
    end if;
    return p_expected_version + 1;
  end if;

  update public.games set
    state = p_state,
    status = v_status,
    host_id = (p_state ->> 'hostId')::uuid,
    version = version + 1,
    started_at = case when v_status <> 'lobby' and started_at is null then now() else started_at end,
    finished_at = case when v_status = 'finished' and finished_at is null then now() else finished_at end
  where id = p_game_id and version = p_expected_version
  returning version into v_version;

  if v_version is null then
    raise exception 'version_conflict';
  end if;

  insert into public.game_secrets (game_id, data) values (p_game_id, p_secret)
  on conflict (game_id) do update set data = excluded.data;

  delete from public.game_players gp
  where gp.game_id = p_game_id
    and gp.user_id not in (select (x ->> 'userId')::uuid from jsonb_array_elements(p_players) x);

  insert into public.game_players (game_id, user_id, seat, left_game, points, place, stats)
  select p_game_id, (x ->> 'userId')::uuid, (x ->> 'seat')::int, (x ->> 'left')::boolean,
         coalesce((x ->> 'points')::int, 0), (x ->> 'place')::int, coalesce(x -> 'stats', '{}'::jsonb)
  from jsonb_array_elements(p_players) x
  on conflict (game_id, user_id) do update set
    seat = excluded.seat, left_game = excluded.left_game, points = excluded.points,
    place = excluded.place, stats = excluded.stats;

  delete from public.game_hands gh
  where gh.game_id = p_game_id
    and gh.user_id not in (select (x ->> 'userId')::uuid from jsonb_array_elements(p_players) x);

  insert into public.game_hands (game_id, user_id, hand, version, updated_at)
  select p_game_id, (x ->> 'userId')::uuid, x -> 'hand', v_version, now()
  from jsonb_array_elements(p_hands) x
  on conflict (game_id, user_id) do update set
    hand = excluded.hand, version = excluded.version, updated_at = excluded.updated_at;

  return v_version;
end $$;

revoke execute on function public.commit_game(uuid, int, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.commit_game(uuid, int, jsonb, jsonb, jsonb, jsonb) to service_role;

-- RLS ----------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.decks enable row level security;
alter table public.games enable row level security;
alter table public.game_secrets enable row level security;
alter table public.game_players enable row level security;
alter table public.game_hands enable row level security;
alter table public.game_invites enable row level security;
alter table public.game_messages enable row level security;

create policy "profiles readable" on public.profiles for select to authenticated using (true);

create policy "own friendships" on public.friendships for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));

-- Decks are shown to fellow players and can be copied, so everyone signed in may read them.
create policy "decks readable" on public.decks for select to authenticated using (true);

create policy "own invites" on public.game_invites for select to authenticated
  using (auth.uid() in (from_id, to_id));

create policy "games readable" on public.games for select to authenticated
  using (
    status = 'finished'
    or public.is_game_member(id)
    or exists (select 1 from public.game_invites i where i.game_id = games.id and i.to_id = auth.uid())
  );

create policy "players readable" on public.game_players for select to authenticated
  using (
    public.is_game_member(game_id)
    or exists (select 1 from public.games g where g.id = game_players.game_id and g.status = 'finished')
  );

create policy "own hand" on public.game_hands for select to authenticated
  using (user_id = auth.uid());

create policy "chat readable for members" on public.game_messages for select to authenticated
  using (public.is_game_member(game_id));

-- No insert/update/delete policies: all writes go through the service role.
-- game_secrets has no policies at all: clients can never read it.

-- VIEWS --------------------------------------------------------------------
create view public.player_stats with (security_invoker = true) as
select
  p.id as user_id,
  p.username::text as username,
  p.avatar_url,
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
  coalesce(sum((f.stats ->> 'cardsPlayed')::int), 0)::int as cards_played
from public.profiles p
left join (
  select gp.* from public.game_players gp
  join public.games g on g.id = gp.game_id
  where g.status = 'finished' and gp.left_game = false
) f on f.user_id = p.id
group by p.id;

create view public.leaderboard with (security_invoker = true) as
select * from public.player_stats where games_played > 0;

-- REALTIME -----------------------------------------------------------------
alter publication supabase_realtime add table
  public.games, public.game_hands, public.game_invites, public.friendships, public.game_messages;

-- Private channel "game:<uuid>": only active members may read (presence/broadcast) and send.
create function public.can_use_game_channel(topic text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if topic is null or topic !~ '^game:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return exists (
    select 1 from public.game_players
    where game_id = substring(topic from 6)::uuid and user_id = auth.uid() and not left_game
  );
end $$;

create policy "game channel read" on realtime.messages for select to authenticated
  using (public.can_use_game_channel(realtime.topic()));

create policy "game channel send" on realtime.messages for insert to authenticated
  with check (public.can_use_game_channel(realtime.topic()));

-- Online status per user: channel "online:<uuid>". Friends may listen, only the owner may track.
create function public.can_read_online_channel(topic text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  owner uuid;
begin
  if topic is null or topic !~ '^online:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  owner := substring(topic from 8)::uuid;
  return owner = auth.uid() or exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = owner and f.addressee_id = auth.uid())
        or (f.addressee_id = owner and f.requester_id = auth.uid()))
  );
end $$;

create policy "online channel read" on realtime.messages for select to authenticated
  using (public.can_read_online_channel(realtime.topic()));

create policy "online channel send" on realtime.messages for insert to authenticated
  with check (realtime.topic() = 'online:' || auth.uid()::text);

-- STORAGE ------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('deck-art', 'deck-art', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "upload own images" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars', 'deck-art') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "replace own images" on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'deck-art') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own images" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'deck-art') and (storage.foldername(name))[1] = auth.uid()::text);
