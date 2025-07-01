-- FleetHub サンプルデータ挿入
-- Expo Go テスト用のデモデータ

-- 1. デモ会社の作成
INSERT INTO companies (id, name, phone, address, registration_number) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'デモ運輸', '03-1234-5678', '東京都千代田区1-1-1', 'DEMO-001')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  address = EXCLUDED.address,
  registration_number = EXCLUDED.registration_number;

-- 2. デモドライバーの作成
INSERT INTO drivers (id, company_id, name, email, phone, status, license_number, hire_date, emergency_contact_name, emergency_contact_phone) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '田中太郎', 'demo@example.com', '090-1234-5678', 'active', '123456789012', '2024-01-01', '田中花子', '090-9876-5432'),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', '佐藤次郎', 'demo2@example.com', '090-2345-6789', 'active', '234567890123', '2024-01-01', '佐藤美代子', '090-8765-4321')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  status = EXCLUDED.status,
  license_number = EXCLUDED.license_number,
  hire_date = EXCLUDED.hire_date,
  emergency_contact_name = EXCLUDED.emergency_contact_name,
  emergency_contact_phone = EXCLUDED.emergency_contact_phone;

-- 3. デモ車両の作成
INSERT INTO vehicles (id, company_id, vehicle_number, last_odometer, make, model, year, fuel_type, inspection_expiry, insurance_expiry) VALUES 
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', '品川500あ1234', 150000, 'いすゞ', 'エルフ', 2022, 'ディーゼル', '2025-12-31', '2025-03-31'),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', '品川500あ5678', 120000, 'トヨタ', 'ダイナ', 2023, 'ディーゼル', '2026-12-31', '2025-03-31')
ON CONFLICT (id) DO UPDATE SET
  company_id = EXCLUDED.company_id,
  vehicle_number = EXCLUDED.vehicle_number,
  last_odometer = EXCLUDED.last_odometer,
  make = EXCLUDED.make,
  model = EXCLUDED.model,
  year = EXCLUDED.year,
  fuel_type = EXCLUDED.fuel_type,
  inspection_expiry = EXCLUDED.inspection_expiry,
  insurance_expiry = EXCLUDED.insurance_expiry;

-- 4. デモ招待コードの作成
INSERT INTO driver_invitations (id, driver_id, code, expires_at, used, password_set) VALUES 
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'DEMO001', '2025-12-31 23:59:59', false, false),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'DEMO002', '2025-12-31 23:59:59', false, false)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  expires_at = EXCLUDED.expires_at,
  used = EXCLUDED.used,
  password_set = EXCLUDED.password_set;

-- 5. よく行く場所のサンプル
INSERT INTO favorite_locations (company_id, name, address, lat, lng, visit_count) VALUES 
('550e8400-e29b-41d4-a716-446655440000', '東京駅', '東京都千代田区丸の内1丁目', 35.681236, 139.767125, 15),
('550e8400-e29b-41d4-a716-446655440000', '羽田空港', '東京都大田区羽田空港', 35.549393, 139.779839, 10),
('550e8400-e29b-41d4-a716-446655440000', '千葉港', '千葉県千葉市中央区中央港1丁目', 35.580531, 140.110016, 8)
ON CONFLICT DO NOTHING;

-- 6. デモ運行予定（もしschedules テーブルが存在する場合）
INSERT INTO schedules (id, schedule_number, company_id, date, driver_id, vehicle_id, status, notes) VALUES 
('600e8400-e29b-41d4-a716-446655440001', 'SCH001-20241231', '550e8400-e29b-41d4-a716-446655440000', CURRENT_DATE, '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'pending', '東京→千葉ルート')
ON CONFLICT (schedule_number) DO NOTHING;

-- 7. 予定配送先（もしschedule_destinations テーブルが存在する場合）
INSERT INTO schedule_destinations (schedule_id, sequence, destination_name, destination_address, action_type, estimated_time) VALUES 
('600e8400-e29b-41d4-a716-446655440001', 1, '東京駅', '東京都千代田区丸の内1丁目', 'pickup', '09:00'),
('600e8400-e29b-41d4-a716-446655440001', 2, '千葉港', '千葉県千葉市中央区中央港1丁目', 'delivery', '11:00')
ON CONFLICT DO NOTHING;

-- 8. サンプル日報データ
INSERT INTO daily_reports (driver_id, vehicle_id, action_type, timestamp, location_lat, location_lng, address, facility_name, odometer, memo) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '出発', '2024-12-31 08:00:00', 35.681236, 139.767125, '東京都千代田区丸の内1丁目', '東京駅', 150000, 'デモデータ'),
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '到着', '2024-12-31 11:00:00', 35.580531, 140.110016, '千葉県千葉市中央区中央港1丁目', '千葉港', 150050, 'デモデータ')
ON CONFLICT DO NOTHING;

-- 確認用クエリ
-- 作成されたデータを確認
SELECT 'Companies' as table_name, COUNT(*) as count FROM companies WHERE name = 'デモ運輸'
UNION ALL
SELECT 'Drivers' as table_name, COUNT(*) as count FROM drivers WHERE company_id = '550e8400-e29b-41d4-a716-446655440000'
UNION ALL
SELECT 'Vehicles' as table_name, COUNT(*) as count FROM vehicles WHERE company_id = '550e8400-e29b-41d4-a716-446655440000'
UNION ALL
SELECT 'Driver Invitations' as table_name, COUNT(*) as count FROM driver_invitations WHERE code IN ('DEMO001', 'DEMO002')
UNION ALL
SELECT 'Favorite Locations' as table_name, COUNT(*) as count FROM favorite_locations WHERE company_id = '550e8400-e29b-41d4-a716-446655440000';