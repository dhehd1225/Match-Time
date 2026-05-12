-- =========================================================
-- KickOff DB Schema
-- Supabase SQL Editor에서 실행
-- =========================================================

-- 1. PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  kakao_id text unique,
  name text not null default '',
  avatar_url text,
  position text default 'MF',
  back_number int,
  created_at timestamptz default now()
);

-- 2. TEAMS
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo text default '⚽',
  description text,
  instagram text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- 3. TEAM_MEMBERS
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('president', 'member')),
  appearances int default 0,
  goals int default 0,
  assists int default 0,
  rating numeric(3,1) default 6.0,
  joined_at timestamptz default now(),
  unique(team_id, user_id)
);

-- 4. MATCHES
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  time time not null,
  region text,
  stadium text not null,
  format text default '11v11',
  level text default '중급' check (level in ('초급', '중급', '고급')),
  home_team_id uuid not null references public.teams(id),
  away_team_id uuid references public.teams(id),
  status text default 'open' check (status in ('open', 'pending', 'confirmed', 'completed')),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- 4-1. MATCH_APPLICATIONS
create table public.match_applications (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id),
  applied_by uuid not null references public.profiles(id),
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz default now(),
  unique(match_id, team_id)
);

-- 5. MATCH_ATTENDANCE
create table public.match_attendance (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text check (status in ('attending', 'not-attending')),
  unique(match_id, user_id)
);

-- 6. LINEUPS
create table public.lineups (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  quarter text not null check (quarter in ('1Q', '2Q', '3Q', '4Q')),
  formation text not null default '4-3-3',
  positions jsonb not null default '[]'::jsonb,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz default now(),
  unique(match_id, quarter)
);

-- 7. CHAT_ROOMS
create table public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('team', 'captain_dm', 'match')),
  team_id uuid references public.teams(id),
  match_id uuid references public.matches(id),
  team_a_id uuid references public.teams(id),
  team_b_id uuid references public.teams(id),
  created_at timestamptz default now()
);

-- 8. CHAT_MESSAGES
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  text text not null,
  created_at timestamptz default now()
);

-- 9. NOTIFICATIONS
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('match_request', 'team_join', 'match_vote', 'info')),
  title text not null,
  description text,
  related_id uuid,
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz default now()
);

-- 10. RANKINGS
create table public.rankings (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  category text not null check (category in ('overall', 'campus', 'regional')),
  power_rating numeric(5,1) default 50.0,
  rank int,
  previous_rank int,
  updated_at timestamptz default now(),
  unique(team_id, category)
);

-- 11. ANALYTICS_EVENTS
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

-- INDEXES
create index idx_team_members_team on public.team_members(team_id);
create index idx_team_members_user on public.team_members(user_id);
create index idx_matches_home on public.matches(home_team_id);
create index idx_matches_away on public.matches(away_team_id);
create index idx_match_applications_match on public.match_applications(match_id);
create index idx_match_applications_team on public.match_applications(team_id);
create index idx_match_attendance_match on public.match_attendance(match_id);
create index idx_chat_messages_room on public.chat_messages(room_id);
create index idx_notifications_user on public.notifications(user_id);
create index idx_analytics_event on public.analytics_events(event);
create index idx_analytics_created on public.analytics_events(created_at);

-- =========================================================
-- RLS POLICIES
-- =========================================================

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.matches enable row level security;
alter table public.match_attendance enable row level security;
alter table public.match_applications enable row level security;
alter table public.lineups enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.rankings enable row level security;

-- PROFILES
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- TEAMS
create policy "teams_select" on public.teams for select using (true);
create policy "teams_insert" on public.teams for insert with check (auth.uid() = created_by);
create policy "teams_update" on public.teams for update using (
  exists (select 1 from public.team_members where team_id = teams.id and user_id = auth.uid() and role = 'president')
);

-- TEAM_MEMBERS
create policy "tm_select" on public.team_members for select using (true);
create policy "tm_insert" on public.team_members for insert with check (
  auth.uid() = user_id or exists (
    select 1 from public.team_members tm where tm.team_id = team_members.team_id and tm.user_id = auth.uid() and tm.role = 'president'
  )
);
create policy "tm_update" on public.team_members for update using (
  exists (select 1 from public.team_members tm where tm.team_id = team_members.team_id and tm.user_id = auth.uid() and tm.role = 'president')
);

-- MATCHES
create policy "matches_select" on public.matches for select using (true);
create policy "matches_insert" on public.matches for insert with check (auth.uid() is not null);
create policy "matches_update" on public.matches for update using (
  exists (select 1 from public.team_members where team_id = matches.home_team_id and user_id = auth.uid() and role = 'president')
);
create policy "matches_update_away" on public.matches for update using (
  exists (select 1 from public.team_members where team_id = matches.away_team_id and user_id = auth.uid() and role = 'president')
);

-- MATCH_ATTENDANCE
create policy "att_select" on public.match_attendance for select using (true);
create policy "att_insert" on public.match_attendance for insert with check (auth.uid() = user_id);
create policy "att_update" on public.match_attendance for update using (auth.uid() = user_id);

-- MATCH_APPLICATIONS
create policy "ma_select" on public.match_applications for select using (true);
create policy "ma_insert" on public.match_applications for insert with check (auth.uid() is not null);
create policy "ma_update" on public.match_applications for update using (auth.uid() is not null);
create policy "ma_delete" on public.match_applications for delete using (auth.uid() is not null);

-- LINEUPS
create policy "lineups_select" on public.lineups for select using (true);
create policy "lineups_insert" on public.lineups for insert with check (auth.uid() is not null);
create policy "lineups_update" on public.lineups for update using (auth.uid() is not null);

-- CHAT
create policy "cr_select" on public.chat_rooms for select using (auth.uid() is not null);
create policy "cr_insert" on public.chat_rooms for insert with check (auth.uid() is not null);
create policy "cm_select" on public.chat_messages for select using (auth.uid() is not null);
create policy "cm_insert" on public.chat_messages for insert with check (auth.uid() = sender_id);

-- NOTIFICATIONS
create policy "notif_select" on public.notifications for select using (auth.uid() = user_id);
create policy "notif_insert" on public.notifications for insert with check (auth.uid() is not null);
create policy "notif_update" on public.notifications for update using (auth.uid() = user_id);

-- DELETE POLICIES (팀 관리, 알림 삭제 등)
create policy "teams_delete" on public.teams for delete using (auth.uid() = created_by);
create policy "tm_delete" on public.team_members for delete using (
  auth.uid() = user_id or exists (
    select 1 from public.teams where id = team_members.team_id and created_by = auth.uid()
  )
);
create policy "matches_delete" on public.matches for delete using (
  exists (select 1 from public.teams where id = matches.home_team_id and created_by = auth.uid())
);
create policy "att_delete" on public.match_attendance for delete using (
  auth.uid() = user_id or exists (
    select 1 from public.teams t join public.matches m on m.home_team_id = t.id
    where m.id = match_attendance.match_id and t.created_by = auth.uid()
  )
);
create policy "notif_delete" on public.notifications for delete using (auth.uid() = user_id);
create policy "lineups_delete" on public.lineups for delete using (auth.uid() is not null);
create policy "cr_delete" on public.chat_rooms for delete using (auth.uid() is not null);
create policy "cm_delete" on public.chat_messages for delete using (auth.uid() is not null);

-- ANALYTICS
alter table public.analytics_events enable row level security;
create policy "analytics_insert" on public.analytics_events for insert with check (auth.uid() is not null);
create policy "analytics_select" on public.analytics_events for select using (auth.uid() is not null);

-- RANKINGS
create policy "rankings_select" on public.rankings for select using (true);
