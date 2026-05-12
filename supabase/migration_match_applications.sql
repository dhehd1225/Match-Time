-- =========================================================
-- 매치 신청 시스템 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- =========================================================

-- 1. match_applications 테이블 생성
create table public.match_applications (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id),
  applied_by uuid not null references public.profiles(id),
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz default now(),
  unique(match_id, team_id)
);

-- 2. RLS 정책
alter table public.match_applications enable row level security;
create policy "ma_select" on public.match_applications for select using (true);
create policy "ma_insert" on public.match_applications for insert with check (auth.uid() is not null);
create policy "ma_update" on public.match_applications for update using (auth.uid() is not null);
create policy "ma_delete" on public.match_applications for delete using (auth.uid() is not null);

-- 3. 인덱스
create index idx_match_applications_match on public.match_applications(match_id);
create index idx_match_applications_team on public.match_applications(team_id);

-- 4. 알림 type 제약조건 업데이트 ('info' 타입 추가)
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('match_request', 'team_join', 'match_vote', 'info'));

-- 5. 기존 pending 매치 정리 (away_team_id 직접 세팅 방식 → applications 방식으로 전환)
-- 기존 pending 매치가 있다면 match_applications로 이관
insert into public.match_applications (match_id, team_id, applied_by, status)
select m.id, m.away_team_id, t.created_by, 'pending'
from public.matches m
join public.teams t on t.id = m.away_team_id
where m.status = 'pending' and m.away_team_id is not null
on conflict (match_id, team_id) do nothing;

-- pending 매치를 open으로 되돌림 (applications 테이블로 이관 완료)
update public.matches set away_team_id = null, status = 'open' where status = 'pending';

-- 6. Realtime 활성화
alter publication supabase_realtime add table public.match_applications;
