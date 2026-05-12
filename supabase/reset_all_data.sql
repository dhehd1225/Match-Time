-- =========================================================
-- KickOff 앱 데이터만 초기화 (auth.users는 건드리지 않음)
-- Supabase SQL Editor에서 실행하세요
-- =========================================================

-- KickOff 전용 테이블만 삭제 (자식 → 부모 순서)
DELETE FROM public.analytics_events;
DELETE FROM public.chat_messages;
DELETE FROM public.chat_rooms;
DELETE FROM public.lineups;
DELETE FROM public.match_applications;
DELETE FROM public.match_attendance;
DELETE FROM public.notifications;
DELETE FROM public.matches;
DELETE FROM public.rankings;
DELETE FROM public.team_members;
DELETE FROM public.teams;

-- profiles는 삭제하되 auth.users는 유지
-- (다음 로그인 시 프로필이 자동 재생성됨)
DELETE FROM public.profiles;
