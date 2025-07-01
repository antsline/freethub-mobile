-- 既存のテーブル構造に合わせた基本サンプルデータ
-- エラーを避けるため、確実に存在するカラムのみ使用

-- 1. デモ会社の作成（基本カラムのみ）
INSERT INTO companies (id, name, created_at) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'デモ運輸', NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. デモドライバーの作成（基本カラムのみ）
INSERT INTO drivers (id, company_id, name, email, status, created_at) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '田中太郎', 'demo@example.com', 'active', NOW())
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  status = EXCLUDED.status;

-- 3. デモ車両の作成（基本カラムのみ）
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

-- 5. 確認
SELECT 'Success: ' || COUNT(*) || ' companies created' FROM companies WHERE name = 'デモ運輸'
UNION ALL
SELECT 'Success: ' || COUNT(*) || ' drivers created' FROM drivers WHERE company_id = '550e8400-e29b-41d4-a716-446655440000'
UNION ALL
SELECT 'Success: ' || COUNT(*) || ' vehicles created' FROM vehicles WHERE company_id = '550e8400-e29b-41d4-a716-446655440000'
UNION ALL
SELECT 'Success: ' || COUNT(*) || ' invitations created' FROM driver_invitations WHERE code = 'DEMO001';