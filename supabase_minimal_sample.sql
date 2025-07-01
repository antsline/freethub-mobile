-- FleetHub 最小限のサンプルデータ
-- 既存のテーブル構造に合わせた基本データ

-- 1. まず既存のテーブル構造を確認
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('companies', 'drivers', 'vehicles', 'driver_invitations')
ORDER BY table_name, ordinal_position;

-- 2. 基本的なサンプルデータ挿入

-- デモ会社（最小限のカラムのみ）
INSERT INTO companies (id, name, created_at) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'デモ運輸', NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- デモドライバー（最小限のカラムのみ）
INSERT INTO drivers (id, company_id, name, email, status, created_at) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '田中太郎', 'demo@example.com', 'active', NOW()),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', '佐藤次郎', 'demo2@example.com', 'active', NOW())
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  status = EXCLUDED.status;

-- デモ車両（最小限のカラムのみ）
INSERT INTO vehicles (id, company_id, vehicle_number, created_at) VALUES 
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', '品川500あ1234', NOW()),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', '品川500あ5678', NOW())
ON CONFLICT (id) DO UPDATE SET 
  vehicle_number = EXCLUDED.vehicle_number;

-- デモ招待コード
INSERT INTO driver_invitations (id, driver_id, code, expires_at, used, created_at) VALUES 
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'DEMO001', '2025-12-31 23:59:59', false, NOW()),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'DEMO002', '2025-12-31 23:59:59', false, NOW())
ON CONFLICT (id) DO UPDATE SET 
  code = EXCLUDED.code,
  expires_at = EXCLUDED.expires_at,
  used = EXCLUDED.used;

-- 3. 確認用クエリ
SELECT 'デモ会社作成完了' as status, COUNT(*) as count FROM companies WHERE name = 'デモ運輸'
UNION ALL
SELECT 'デモドライバー作成完了' as status, COUNT(*) as count FROM drivers WHERE company_id = '550e8400-e29b-41d4-a716-446655440000'
UNION ALL
SELECT 'デモ車両作成完了' as status, COUNT(*) as count FROM vehicles WHERE company_id = '550e8400-e29b-41d4-a716-446655440000'
UNION ALL
SELECT 'デモ招待コード作成完了' as status, COUNT(*) as count FROM driver_invitations WHERE code IN ('DEMO001', 'DEMO002');