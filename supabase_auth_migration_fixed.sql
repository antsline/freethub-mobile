-- 修正版：Supabase Auth対応のためのマイグレーション

-- === STEP 1: テーブル構造の修正 ===

-- 1. driversテーブルにauth_user_idカラムを追加
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS auth_user_id TEXT UNIQUE;

-- 2. favorite_locationsテーブルにdriver_idカラムを追加
ALTER TABLE favorite_locations ADD COLUMN IF NOT EXISTS driver_id TEXT;

-- 3. 既存のfavorite_locationsデータにdriver_idを設定
-- （company_idから最初のドライバーを選択して設定）
UPDATE favorite_locations 
SET driver_id = (
  SELECT id FROM drivers 
  WHERE company_id = favorite_locations.company_id 
  LIMIT 1
)
WHERE driver_id IS NULL;

-- === STEP 2: インデックスとFK制約の作成 ===

-- 4. インデックスを作成
CREATE INDEX IF NOT EXISTS idx_drivers_auth_user_id ON drivers(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_locations_driver_id ON favorite_locations(driver_id);

-- 5. 外部キー制約を追加
ALTER TABLE favorite_locations 
ADD CONSTRAINT IF NOT EXISTS fk_favorite_locations_driver 
FOREIGN KEY (driver_id) REFERENCES drivers(id);

-- === STEP 3: RLS一時無効化（安全に移行するため） ===

-- 6. 一旦RLSを無効化（認証システム移行中のため）
ALTER TABLE daily_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;

-- === STEP 4: 既存ポリシーのクリーンアップ ===

-- 7. 既存のポリシーを削除
DROP POLICY IF EXISTS "daily_reports_policy" ON daily_reports;
DROP POLICY IF EXISTS "daily_reports_insert_policy" ON daily_reports;
DROP POLICY IF EXISTS "daily_reports_select_policy" ON daily_reports;
DROP POLICY IF EXISTS "favorite_locations_policy" ON favorite_locations;
DROP POLICY IF EXISTS "vehicles_policy" ON vehicles;

-- === STEP 5: 確認クエリ ===

-- 8. テーブル構造の確認
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('drivers', 'favorite_locations', 'daily_reports')
  AND column_name IN ('auth_user_id', 'driver_id')
ORDER BY table_name, column_name;

-- 9. RLS状態の確認
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled 
FROM pg_class 
WHERE relname IN ('daily_reports', 'favorite_locations', 'vehicles', 'drivers');

-- === 注意事項 ===
-- このスクリプト実行後、アプリ側の認証システムを更新してから
-- 後でRLSを再有効化します