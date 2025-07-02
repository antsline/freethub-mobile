-- driversテーブルの実際のカラム構造を確認

-- 1. driversテーブルの全カラムを確認
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'drivers'
ORDER BY ordinal_position;

-- 2. サンプルデータを確認
SELECT 
  id,
  company_id,
  name,
  email,
  phone,
  status,
  auth_user_id,
  created_at
FROM drivers
LIMIT 3;