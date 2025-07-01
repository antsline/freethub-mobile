-- 会社データの詳細確認

-- 1. 全ての会社データを表示
SELECT id, name, length(name) as name_length, created_at 
FROM companies;

-- 2. 会社名の文字コードを確認
SELECT 
  id, 
  name, 
  encode(name::bytea, 'hex') as name_hex,
  ascii(substring(name, 1, 1)) as first_char_ascii
FROM companies;

-- 3. 様々な検索パターンをテスト
SELECT 'exact match' as search_type, COUNT(*) FROM companies WHERE name = 'デモ運輸'
UNION ALL
SELECT 'case insensitive' as search_type, COUNT(*) FROM companies WHERE LOWER(name) = LOWER('デモ運輸')
UNION ALL
SELECT 'with ilike' as search_type, COUNT(*) FROM companies WHERE name ILIKE 'デモ運輸'
UNION ALL
SELECT 'with like' as search_type, COUNT(*) FROM companies WHERE name LIKE 'デモ運輸'
UNION ALL
SELECT 'starts with' as search_type, COUNT(*) FROM companies WHERE name ILIKE 'デモ%';