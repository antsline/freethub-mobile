-- Supabase Auth対応のためのマイグレーション

-- 1. driversテーブルにauth_user_idカラムを追加
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS auth_user_id TEXT UNIQUE;

-- 2. インデックスを作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_drivers_auth_user_id ON drivers(auth_user_id);

-- 3. 既存のRLSポリシーを削除
DROP POLICY IF EXISTS "daily_reports_policy" ON daily_reports;
DROP POLICY IF EXISTS "daily_reports_insert_policy" ON daily_reports;
DROP POLICY IF EXISTS "daily_reports_select_policy" ON daily_reports;

-- 4. 新しいRLSポリシーを作成（auth_user_idベース）
CREATE POLICY "daily_reports_auth_policy" ON daily_reports
  FOR ALL 
  USING (
    -- 認証されたユーザーで、かつ自分のdriver_idに関連するレコードのみ
    auth.role() = 'authenticated' AND
    driver_id IN (
      SELECT id FROM drivers 
      WHERE auth_user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    -- 挿入時も同じ条件
    auth.role() = 'authenticated' AND
    driver_id IN (
      SELECT id FROM drivers 
      WHERE auth_user_id = auth.uid()::text
    )
  );

-- 5. favorite_locationsテーブルのRLSポリシーも更新
DROP POLICY IF EXISTS "favorite_locations_policy" ON favorite_locations;

CREATE POLICY "favorite_locations_auth_policy" ON favorite_locations
  FOR ALL 
  USING (
    auth.role() = 'authenticated' AND
    driver_id IN (
      SELECT id FROM drivers 
      WHERE auth_user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    driver_id IN (
      SELECT id FROM drivers 
      WHERE auth_user_id = auth.uid()::text
    )
  );

-- 6. vehiclesテーブルのRLSポリシー（オプション）
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicles_company_policy" ON vehicles
  FOR SELECT 
  USING (
    company_id IN (
      SELECT company_id FROM drivers 
      WHERE auth_user_id = auth.uid()::text
    )
  );

-- 7. 確認クエリ
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled 
FROM pg_class 
WHERE relname IN ('daily_reports', 'favorite_locations', 'vehicles', 'drivers');

-- 8. ポリシー確認
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('daily_reports', 'favorite_locations', 'vehicles');