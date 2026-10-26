-- PUSH ---------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
-- No policies: only the server reads and writes subscriptions.

-- COURTS ("Höfe") ------------------------------------------------------------
create table public.courts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  crest text not null default 'h-crown' check (char_length(crest) <= 32),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  invite_code text not null unique check (invite_code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  created_at timestamptz not null default now()
);

create table public.court_members (
  court_id uuid not null references public.courts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (court_id, user_id)
);
create index court_members_user_idx on public.court_members (user_id);

create function public.is_court_member(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.court_members where court_id = cid and user_id = auth.uid());
$$;

alter table public.courts enable row level security;
alter table public.court_members enable row level security;
create policy "courts readable by members" on public.courts for select to authenticated using (public.is_court_member(id));
create policy "court members readable by members" on public.court_members for select to authenticated using (public.is_court_member(court_id));

-- DECK GALLERY ---------------------------------------------------------------
alter table public.decks add column public boolean not null default false;

create table public.deck_likes (
  deck_id uuid not null references public.decks (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (deck_id, user_id)
);
alter table public.deck_likes enable row level security;
create policy "deck likes readable" on public.deck_likes for select to authenticated using (true);
