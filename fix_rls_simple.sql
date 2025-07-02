-- より単純なRLSポリシーで修正

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "daily_reports_policy" ON daily_reports;
DROP POLICY IF EXISTS "daily_reports_insert_policy" ON daily_reports;
DROP POLICY IF EXISTS "daily_reports_select_policy" ON daily_reports;
DROP POLICY IF EXISTS "daily_reports_update_policy" ON daily_reports;
DROP POLICY IF EXISTS "daily_reports_delete_policy" ON daily_reports;

-- シンプルなポリシーを作成（認証済みユーザーなら誰でもアクセス可能）
CREATE POLICY "daily_reports_authenticated_access" ON daily_reports
  FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- または、ドライバーに関連するデータのみアクセス可能
-- CREATE POLICY "daily_reports_driver_access" ON daily_reports
--   FOR ALL 
--   USING (
--     driver_id IN (
--       SELECT id FROM drivers 
--       WHERE auth_user_id = auth.uid()::text
--     )
--   )
--   WITH CHECK (
--     driver_id IN (
--       SELECT id FROM drivers 
--       WHERE auth_user_id = auth.uid()::text
--     )
--   );