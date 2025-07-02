-- favorite_locationsテーブルの不足カラムを追加

-- 1. created_byカラムを追加
ALTER TABLE favorite_locations 
ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'manual';

-- 2. created_byカラムにCHECK制約を追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_created_by'
    ) THEN
        ALTER TABLE favorite_locations 
        ADD CONSTRAINT check_created_by 
        CHECK (created_by IN ('manual', 'auto'));
    END IF;
END $$;

-- 3. その他の不足カラムも確認・追加
ALTER TABLE favorite_locations 
ADD COLUMN IF NOT EXISTS memo TEXT;

ALTER TABLE favorite_locations 
ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 0;

ALTER TABLE favorite_locations 
ADD COLUMN IF NOT EXISTS last_visited TIMESTAMP WITH TIME ZONE;

ALTER TABLE favorite_locations 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE favorite_locations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;

-- 4. 既存データの更新
UPDATE favorite_locations 
SET 
  created_by = 'manual',
  visit_count = COALESCE(visit_count, 0),
  is_active = COALESCE(is_active, true),
  category = COALESCE(category, 'other'),
  updated_at = COALESCE(updated_at, created_at)
WHERE created_by IS NULL 
   OR visit_count IS NULL 
   OR is_active IS NULL 
   OR category IS NULL 
   OR updated_at IS NULL;

-- 5. テーブル構造の確認
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'favorite_locations' 
ORDER BY ordinal_position;

-- 6. サンプルデータの確認
SELECT 
  id, 
  name, 
  category, 
  created_by, 
  visit_count, 
  is_active,
  created_at,
  updated_at
FROM favorite_locations 
LIMIT 3;