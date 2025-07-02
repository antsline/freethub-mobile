-- UUID型対応修正版：Supabase Auth対応のためのマイグレーション

-- === STEP 1: テーブル構造の確認 ===

-- 1. driversテーブルのidカラムの型を確認
SELECT 
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'drivers' AND column_name = 'id';

-- === STEP 2: テーブル構造の修正 ===

-- 2. driversテーブルにauth_user_idカラムを追加
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS auth_user_id TEXT UNIQUE;

-- 3. favorite_locationsテーブルのdriver_idカラムを正しい型で追加
-- まず既存のdriver_idカラムを削除（存在する場合）
ALTER TABLE favorite_locations DROP COLUMN IF EXISTS driver_id;

-- UUIDサポートを有効化（必要に応じて）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 4. 正しいUUID型でdriver_idカラムを追加
ALTER TABLE favorite_locations ADD COLUMN driver_id UUID;

-- 5. 既存のfavorite_locationsデータにdriver_idを設定
UPDATE favorite_locations 
SET driver_id = (
  SELECT id FROM drivers 
  WHERE company_id = favorite_locations.company_id 
  LIMIT 1
)
WHERE driver_id IS NULL;

-- === STEP 3: インデックスの作成 ===

-- 6. インデックスを作成
CREATE INDEX IF NOT EXISTS idx_drivers_auth_user_id ON drivers(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_locations_driver_id ON favorite_locations(driver_id);

-- === STEP 4: 外部キー制約の作成 ===

-- 7. 既存の制約を削除（エラーを無視）
DO $$
BEGIN
    ALTER TABLE favorite_locations DROP CONSTRAINT IF EXISTS fk_favorite_locations_driver;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- 8. 外部キー制約を追加（UUID同士なので正常に作成される）
ALTER TABLE favorite_locations 
ADD CONSTRAINT fk_favorite_locations_driver 
FOREIGN KEY (driver_id) REFERENCES drivers(id);

-- === STEP 5: RLS一時無効化 ===

-- 9. 一旦RLSを無効化
ALTER TABLE daily_reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;

-- === STEP 6: 既存ポリシーのクリーンアップ ===

-- 10. 既存のポリシーを削除
DROP POLICY IF EXISTS "daily_reports_policy" ON daily_reports;
DROP POLICY IF EXISTS "daily_reports_insert_policy" ON daily_reports;
DROP POLICY IF EXISTS "daily_reports_select_policy" ON daily_reports;
DROP POLICY IF EXISTS "favorite_locations_policy" ON favorite_locations;
DROP POLICY IF EXISTS "vehicles_policy" ON vehicles;

-- === STEP 7: 確認クエリ ===

-- 11. テーブル構造の確認
SELECT 
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name IN ('drivers', 'favorite_locations', 'daily_reports')
  AND column_name IN ('auth_user_id', 'driver_id', 'id')
ORDER BY table_name, column_name;

-- 12. RLS状態の確認
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled 
FROM pg_class 
WHERE relname IN ('daily_reports', 'favorite_locations', 'vehicles', 'drivers');

-- 13. 制約の確認
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_name IN ('favorite_locations', 'drivers')
  AND tc.constraint_type = 'FOREIGN KEY';

-- 14. favorite_locationsテーブルのデータ確認
SELECT 
  id,
  name,
  company_id,
  driver_id,
  visit_count
FROM favorite_locations
LIMIT 5;