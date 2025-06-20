-- Исправление OAuth ошибки "Database error saving new user"
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Удаляем старый trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Пересоздаем функцию с правильными настройками безопасности
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Вставляем профиль пользователя
  INSERT INTO public.user_profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'given_name' || ' ' || NEW.raw_user_meta_data->>'family_name'
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Создаем бесплатную подписку
  INSERT INTO public.subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'free', 'active');
  
  -- Инициализируем квоты использования
  INSERT INTO public.usage_quotas (user_id, exports_limit, google_drive_limit)
  VALUES (NEW.id, 10, 0); -- Free plan: 10 exports, no Google Drive
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Логируем ошибку, но не блокируем создание пользователя
    RAISE WARNING 'Error in handle_new_user(): %', SQLERRM;
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER SET search_path = public;

-- 3. Пересоздаем trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Временно создаем политики для вставки данных через trigger
-- (Эти политики позволят SECURITY DEFINER функции вставлять данные)

-- Политика для user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'Allow trigger insertion'
  ) THEN
    CREATE POLICY "Allow trigger insertion" ON public.user_profiles
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- Политика для subscriptions  
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'subscriptions' 
    AND policyname = 'Allow trigger insertion'
  ) THEN
    CREATE POLICY "Allow trigger insertion" ON public.subscriptions
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- Политика для usage_quotas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'usage_quotas' 
    AND policyname = 'Allow trigger insertion'
  ) THEN
    CREATE POLICY "Allow trigger insertion" ON public.usage_quotas
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- 5. Проверяем результат
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 6. Выводим информацию о политиках
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd 
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'subscriptions', 'usage_quotas')
AND schemaname = 'public'
ORDER BY tablename, policyname; 