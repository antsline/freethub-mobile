-- 既存のテーブル構造に合わせた確実に動作するサンプルデータ

-- 1. デモ会社の作成
INSERT INTO companies (id, name, created_at) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'デモ運輸', NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. デモドライバーの作成
INSERT INTO drivers (id, company_id, name, email, status, created_at) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '田中太郎', 'demo@example.com', 'active', NOW())
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  status = EXCLUDED.status;

-- 3. デモ車両の作成
INSERT INTO vehicles (id, company_id, vehicle_number, created_at) VALUES 
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', '品川500あ1234', NOW())
ON CONFLICT (id) DO UPDATE SET 
  vehicle_number = EXCLUDED.vehicle_number;

-- 4. デモ招待コードの作成
INSERT INTO driver_invitations (id, driver_id, code, expires_at, used, created_at) VALUES 
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'DEMO001', '2025-12-31 23:59:59'::timestamp, false, NOW())
ON CONFLICT (id) DO UPDATE SET 
  code = EXCLUDED.code,
  expires_at = EXCLUDED.expires_at,
  used = EXCLUDED.used;

-- 5. よく行く場所のサンプル
INSERT INTO favorite_locations (id, company_id, name, address, lat, lng, visit_count, created_at) VALUES 
('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '東京駅', '東京都千代田区丸の内1丁目', 35.681236, 139.767125, 15, NOW()),
('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', '羽田空港', '東京都大田区羽田空港', 35.549393, 139.779839, 10, NOW())
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  visit_count = EXCLUDED.visit_count;

-- 6. 確認クエリ
SELECT 
  'companies' as table_name, 
  COUNT(*) as count,
  string_agg(name, ', ') as names
FROM companies WHERE name = 'デモ運輸'
UNION ALL
SELECT 
  'drivers' as table_name, 
  COUNT(*) as count,
  string_agg(name, ', ') as names
FROM drivers WHERE company_id = '550e8400-e29b-41d4-a716-446655440000'
UNION ALL
SELECT 
  'vehicles' as table_name, 
  COUNT(*) as count,
  string_agg(vehicle_number, ', ') as names
FROM vehicles WHERE company_id = '550e8400-e29b-41d4-a716-446655440000'
UNION ALL
SELECT 
  'driver_invitations' as table_name, 
  COUNT(*) as count,
  string_agg(code, ', ') as names
FROM driver_invitations WHERE code = 'DEMO001'
UNION ALL
SELECT 
  'favorite_locations' as table_name, 
  COUNT(*) as count,
  string_agg(name, ', ') as names
FROM favorite_locations WHERE company_id = '550e8400-e29b-41d4-a716-446655440000';

-- 7. 招待コードとドライバーの関連確認
SELECT 
  di.code as invitation_code,
  d.name as driver_name,
  c.name as company_name,
  di.expires_at,
  di.used
FROM driver_invitations di
JOIN drivers d ON di.driver_id = d.id
JOIN companies c ON d.company_id = c.id
WHERE di.code = 'DEMO001';