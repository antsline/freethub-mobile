-- daily_reports テーブルのRLSポリシー確認と修正

-- 1. 現在のRLSポリシーを確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'daily_reports';

-- 2. 現在のRLS設定を確認
SELECT relname, relrowsecurity, relforcerowsecurity 
FROM pg_class 
WHERE relname = 'daily_reports';

-- 3. 一時的にRLSを無効化（デバッグ用）
ALTER TABLE daily_reports DISABLE ROW LEVEL SECURITY;

-- 4. または適切なINSERTポリシーを追加
DROP POLICY IF EXISTS "daily_reports_insert_policy" ON daily_reports;

CREATE POLICY "daily_reports_insert_policy" ON daily_reports
  FOR INSERT 
  WITH CHECK (
    -- ログインユーザーのdriver_idと一致する記録のみ挿入可能
    auth.uid()::text IN (
      SELECT auth_user_id::text 
      FROM drivers 
      WHERE id = driver_id
    )
  );

-- 5. SELECTポリシーも確認・更新
DROP POLICY IF EXISTS "daily_reports_select_policy" ON daily_reports;

CREATE POLICY "daily_reports_select_policy" ON daily_reports
  FOR SELECT 
  USING (
    -- ログインユーザーのdriver_idと一致する記録のみ閲覧可能
    auth.uid()::text IN (
      SELECT auth_user_id::text 
      FROM drivers 
      WHERE id = driver_id
    )
  );

-- 6. UPDATEポリシー
DROP POLICY IF EXISTS "daily_reports_update_policy" ON daily_reports;

CREATE POLICY "daily_reports_update_policy" ON daily_reports
  FOR UPDATE 
  USING (
    auth.uid()::text IN (
      SELECT auth_user_id::text 
      FROM drivers 
      WHERE id = driver_id
    )
  )
  WITH CHECK (
    auth.uid()::text IN (
      SELECT auth_user_id::text 
      FROM drivers 
      WHERE id = driver_id
    )
  );

-- 7. DELETEポリシー
DROP POLICY IF EXISTS "daily_reports_delete_policy" ON daily_reports;

CREATE POLICY "daily_reports_delete_policy" ON daily_reports
  FOR DELETE 
  USING (
    auth.uid()::text IN (
      SELECT auth_user_id::text 
      FROM drivers 
      WHERE id = driver_id
    )
  );

-- 8. RLSを再有効化
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;