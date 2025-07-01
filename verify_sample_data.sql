-- サンプルデータの確認クエリ

-- 1. 会社データの確認
SELECT 'companies' as table_name, id, name, created_at 
FROM companies 
WHERE name ILIKE '%デモ運輸%';

-- 2. ドライバーデータの確認
SELECT 'drivers' as table_name, id, company_id, name, email, status
FROM drivers 
WHERE company_id = '550e8400-e29b-41d4-a716-446655440000';

-- 3. 招待コードの確認
SELECT 'driver_invitations' as table_name, id, driver_id, code, expires_at, used
FROM driver_invitations 
WHERE code = 'DEMO001';

-- 4. JOINクエリで関連データを確認
SELECT 
  c.name as company_name,
  d.name as driver_name,
  di.code as invitation_code,
  di.expires_at,
  di.used
FROM driver_invitations di
JOIN drivers d ON di.driver_id = d.id
JOIN companies c ON d.company_id = c.id
WHERE di.code = 'DEMO001';

-- 5. 会社名の部分検索テスト
SELECT id, name FROM companies WHERE name ILIKE '%デモ%';
SELECT id, name FROM companies WHERE name ILIKE '%運輸%';