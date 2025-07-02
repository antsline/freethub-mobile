-- 最終修正版：Supabase Auth対応のためのマイグレーション

-- === STEP 1: テーブル構造の修正 ===

-- 1. driversテーブルにauth_user_idカラムを追加
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS auth_user_id TEXT UNIQUE;

-- 2. favorite_locationsテーブルにdriver_idカラムを追加
ALTER TABLE favorite_locations ADD COLUMN IF NOT EXISTS driver_id TEXT;

-- 3. 既存のfavorite_locationsデータにdriver_idを設定
UPDATE favorite_locations 
SET driver_id = (
  SELECT id FROM drivers 
  WHERE company_id = favorite_locations.company_id 
  LIMIT 1
)
WHERE driver_id IS NULL;

-- === STEP 2: インデックスの作成 ===

-- 4. インデックスを作成
CREATE INDEX IF NOT EXISTS idx_drivers_auth_user_id ON drivers(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_locations_driver_id ON favorite_locations(driver_id);

-- === STEP 3: 外部キー制約の作成（既存制約がある場合は削除してから作成） ===

-- 5. 既存の制約を削除（エラーを無視）
DO $$
BEGIN
    ALTER TABLE favorite_locations DROP CONSTRAINT IF EXISTS fk_favorite_locations_driver;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- 6. 外部キー制約を追加
ALTER TABLE favorite_locations 
ADD CONSTRAINT fk_favorite_locations_driver 
FOREIGN KEY (driver_id) REFERENCES drivers(id);

-- === STEP 4: RLS一時無効化（安全に移行するため） ===

-- 7. 一旦RLSを無効化（認証システム移行中のため）
ALTER TABLE daily_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;

-- === STEP 5: 既存ポリシーのクリーンアップ ===

-- 8. 既存のポリシーを削除
DROP POLICY IF EXISTS "daily_reports_policy" ON daily_reports;
DROP POLICY IF EXISTS "daily_reports_insert_policy" ON daily_reports;
DROP POLICY IF EXISTS "daily_reports_select_policy" ON daily_reports;
DROP POLICY IF EXISTS "favorite_locations_policy" ON favorite_locations;
DROP POLICY IF EXISTS "vehicles_policy" ON vehicles;

-- === STEP 6: 確認クエリ ===

-- 9. テーブル構造の確認
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('drivers', 'favorite_locations', 'daily_reports')
  AND column_name IN ('auth_user_id', 'driver_id')
ORDER BY table_name, column_name;

-- 10. RLS状態の確認
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled 
FROM pg_class 
WHERE relname IN ('daily_reports', 'favorite_locations', 'vehicles', 'drivers');

-- 11. 制約の確認
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_name IN ('favorite_locations', 'drivers')
  AND tc.constraint_type = 'FOREIGN KEY';