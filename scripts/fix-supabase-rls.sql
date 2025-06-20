-- Исправление RLS политик для OAuth авторизации
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Проверяем существующие RLS политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'auth';

-- 2. Если есть проблемы с auth.users, временно отключаем RLS (только для тестирования)
-- ВНИМАНИЕ: Это менее безопасно, используйте только для диагностики
-- ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;

-- 3. Альтернативно - создаем правильную политику для auth.users
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_policies 
--     WHERE schemaname = 'auth' 
--     AND tablename = 'users' 
--     AND policyname = 'Allow OAuth user creation'
--   ) THEN
--     CREATE POLICY "Allow OAuth user creation" ON auth.users
--     FOR INSERT
--     WITH CHECK (true);
--   END IF;
-- END $$;

-- 4. Проверяем настройки auth schema
SELECT setting, unit FROM pg_settings WHERE name = 'log_statement';

-- 5. Проверяем существующих пользователей
SELECT id, email, created_at, email_confirmed_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;

-- 6. Если проблема в triggers, временно отключаем их
-- SELECT tgname, tgrelid::regclass, tgenabled 
-- FROM pg_trigger 
-- WHERE tgrelid = 'auth.users'::regclass;

-- 7. Для диагностики - включаем детальное логирование
-- ALTER SYSTEM SET log_statement = 'all';
-- SELECT pg_reload_conf();

COMMENT ON TABLE auth.users IS 'Debugging RLS policies for OAuth'; 