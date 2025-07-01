-- 車両データの確認

-- 1. デモ会社の車両を確認
SELECT 
  v.id,
  v.vehicle_number,
  v.company_id,
  v.current_driver_id,
  v.last_odometer,
  c.name as company_name
FROM vehicles v
JOIN companies c ON v.company_id = c.id
WHERE c.name = 'デモ運輸';

-- 2. 会社IDで直接確認
SELECT * FROM vehicles 
WHERE company_id = '550e8400-e29b-41d4-a716-446655440000';

-- 3. 全車両の確認
SELECT 
  v.vehicle_number,
  c.name as company_name,
  d.name as current_driver_name
FROM vehicles v
LEFT JOIN companies c ON v.company_id = c.id
LEFT JOIN drivers d ON v.current_driver_id = d.id;