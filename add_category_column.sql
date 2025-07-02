-- favorite_locationsテーブルにcategoryカラムを追加

-- 1. categoryカラムを追加
ALTER TABLE favorite_locations 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other';

-- 2. categoryカラムにCHECK制約を追加
ALTER TABLE favorite_locations 
ADD CONSTRAINT check_category 
CHECK (category IN ('delivery', 'rest', 'fuel', 'parking', 'other'));

-- 3. 既存データのcategoryを'other'に設定
UPDATE favorite_locations 
SET category = 'other' 
WHERE category IS NULL;

-- 4. 確認クエリ
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'favorite_locations' 
  AND column_name = 'category';

-- 5. サンプルデータ確認
SELECT id, name, category, created_at 
FROM favorite_locations 
LIMIT 5;