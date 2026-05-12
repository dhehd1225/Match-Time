-- =========================================================
-- 참여 선호도 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- =========================================================

-- match_attendance에 선호 포지션, 희망 쿼터 추가
ALTER TABLE public.match_attendance
  ADD COLUMN IF NOT EXISTS preferred_positions jsonb DEFAULT '[]'::jsonb;

-- desired_quarters를 jsonb로 변경 (특정 쿼터 선택용)
ALTER TABLE public.match_attendance
  DROP COLUMN IF EXISTS desired_quarters;

ALTER TABLE public.match_attendance
  ADD COLUMN IF NOT EXISTS desired_quarters jsonb DEFAULT '["1Q","2Q","3Q","4Q"]'::jsonb;
