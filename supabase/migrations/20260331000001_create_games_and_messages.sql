-- Games table
create table public.games (
  id text primary key,
  white_player text not null,
  black_player text,
  status text not null default 'waiting',
  game_state jsonb,
  created_at timestamp with time zone default now()
);

-- Messages table
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  game_id text references public.games(id) on delete cascade not null,
  sender text not null,
  text text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.games enable row level security;
alter table public.messages enable row level security;

-- Allow anyone to read/write games (no auth required)
create policy "Anyone can read games" on public.games for select using (true);
create policy "Anyone can insert games" on public.games for insert with check (true);
create policy "Anyone can update games" on public.games for update using (true);

-- Allow anyone to read/write messages
create policy "Anyone can read messages" on public.messages for select using (true);
create policy "Anyone can insert messages" on public.messages for insert with check (true);

-- Enable realtime
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.messages;
