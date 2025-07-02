-- 緊急時：daily_reports テーブルのRLSを一時的に無効化
-- 注意：本番環境では絶対に実行しないでください

-- 1. RLSを無効化
ALTER TABLE daily_reports DISABLE ROW LEVEL SECURITY;

-- 確認
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'daily_reports';

-- 再有効化する場合（後で実行）
-- ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;