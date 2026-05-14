-- ============================================
-- Supabase 대시보드 SQL Editor에서 실행해주세요
-- ============================================

-- 1. matches 테이블에 스코어 컬럼 추가
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_score integer;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_score integer;

-- 2. match_events 테이블 생성 (골/어시스트 기록)
CREATE TABLE IF NOT EXISTS match_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  team_id uuid REFERENCES teams(id) NOT NULL,
  scorer_id uuid REFERENCES profiles(id),
  assister_id uuid REFERENCES profiles(id),
  minute integer,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. match_events RLS 정책
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read match_events') THEN
    CREATE POLICY "Anyone can read match_events" ON match_events FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth users can insert match_events') THEN
    CREATE POLICY "Auth users can insert match_events" ON match_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth users can update match_events') THEN
    CREATE POLICY "Auth users can update match_events" ON match_events FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth users can delete match_events') THEN
    CREATE POLICY "Auth users can delete match_events" ON match_events FOR DELETE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 4. match_attendance 유니크 제약조건 (upsert 안정성)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'match_attendance_match_id_user_id_key'
  ) THEN
    -- 중복 데이터 제거 후 유니크 제약조건 추가
    DELETE FROM match_attendance a USING match_attendance b
    WHERE a.id > b.id AND a.match_id = b.match_id AND a.user_id = b.user_id;

    ALTER TABLE match_attendance ADD CONSTRAINT match_attendance_match_id_user_id_key UNIQUE (match_id, user_id);
  END IF;
END $$;

-- 5. match_attendance에 선호도 컬럼 (이미 있으면 무시)
ALTER TABLE match_attendance ADD COLUMN IF NOT EXISTS preferred_positions text[];
ALTER TABLE match_attendance ADD COLUMN IF NOT EXISTS desired_quarters text[];
