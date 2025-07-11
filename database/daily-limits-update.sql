-- Обновление schema для поддержки дневных лимитов экспорта
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Добавляем новые поля в usage_quotas для дневного отслеживания
ALTER TABLE usage_quotas 
ADD COLUMN IF NOT EXISTS exports_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Обновляем существующие записи
UPDATE usage_quotas 
SET exports_today = 0, 
    last_reset_date = NOW() 
WHERE exports_today IS NULL OR last_reset_date IS NULL;

-- 3. Создаем функцию для увеличения дневного счетчика экспортов
CREATE OR REPLACE FUNCTION increment_daily_exports(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
  today_str TEXT;
  last_reset_str TEXT;
BEGIN
  -- Получаем текущую дату как строку
  today_str := CURRENT_DATE::TEXT;
  
  -- Получаем дату последнего сброса
  SELECT DATE(last_reset_date)::TEXT INTO last_reset_str
  FROM usage_quotas 
  WHERE user_id = user_uuid;
  
  -- Если это новый день, сбрасываем счетчик
  IF last_reset_str IS NULL OR last_reset_str != today_str THEN
    UPDATE usage_quotas 
    SET 
      exports_today = 1,
      last_reset_date = NOW()
    WHERE user_id = user_uuid;
  ELSE
    -- Увеличиваем счетчик на 1
    UPDATE usage_quotas 
    SET exports_today = exports_today + 1
    WHERE user_id = user_uuid;
  END IF;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- 4. Создаем функцию для проверки дневных лимитов
CREATE OR REPLACE FUNCTION check_daily_export_limit(user_uuid UUID)
RETURNS TABLE(
  can_export BOOLEAN,
  exports_today INTEGER,
  daily_limit INTEGER,
  plan_type TEXT
) AS $$
DECLARE
  user_plan TEXT;
  daily_exports INTEGER;
  today_str TEXT;
  last_reset_str TEXT;
BEGIN
  -- Получаем план пользователя
  SELECT s.plan_type INTO user_plan
  FROM subscriptions s
  WHERE s.user_id = user_uuid AND s.status = 'active';
  
  -- Если нет активной подписки, считаем бесплатным планом
  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;
  
  -- Получаем текущую дату как строку
  today_str := CURRENT_DATE::TEXT;
  
  -- Получаем данные об использовании
  SELECT 
    uq.exports_today,
    DATE(uq.last_reset_date)::TEXT
  INTO daily_exports, last_reset_str
  FROM usage_quotas uq
  WHERE uq.user_id = user_uuid;
  
  -- Если это новый день, сбрасываем счетчик
  IF last_reset_str IS NULL OR last_reset_str != today_str THEN
    daily_exports := 0;
    
    -- Обновляем в базе
    UPDATE usage_quotas 
    SET 
      exports_today = 0,
      last_reset_date = NOW()
    WHERE user_id = user_uuid;
  END IF;
  
  -- Возвращаем результат
  RETURN QUERY SELECT 
    CASE 
      WHEN user_plan = 'free' THEN daily_exports < 5
      ELSE TRUE -- Pro план - без лимитов
    END as can_export,
    daily_exports as exports_today,
    CASE 
      WHEN user_plan = 'free' THEN 5
      ELSE -1 -- -1 означает безлимитный
    END as daily_limit,
    user_plan as plan_type;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- 5. Создаем функцию для получения статистики использования
CREATE OR REPLACE FUNCTION get_usage_stats(user_uuid UUID)
RETURNS TABLE(
  exports_today INTEGER,
  daily_limit INTEGER,
  exports_remaining INTEGER,
  plan_type TEXT,
  can_export BOOLEAN,
  reset_time TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  user_plan TEXT;
  daily_exports INTEGER;
  limit_value INTEGER;
  today_str TEXT;
  last_reset_str TEXT;
  tomorrow TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Получаем план пользователя
  SELECT s.plan_type INTO user_plan
  FROM subscriptions s
  WHERE s.user_id = user_uuid AND s.status = 'active';
  
  -- Если нет активной подписки, считаем бесплатным планом
  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;
  
  -- Устанавливаем лимит в зависимости от плана
  IF user_plan = 'free' THEN
    limit_value := 5;
  ELSE
    limit_value := -1; -- Безлимитный
  END IF;
  
  -- Получаем текущую дату как строку
  today_str := CURRENT_DATE::TEXT;
  
  -- Получаем данные об использовании
  SELECT 
    uq.exports_today,
    DATE(uq.last_reset_date)::TEXT
  INTO daily_exports, last_reset_str
  FROM usage_quotas uq
  WHERE uq.user_id = user_uuid;
  
  -- Если это новый день, сбрасываем счетчик
  IF last_reset_str IS NULL OR last_reset_str != today_str THEN
    daily_exports := 0;
    
    -- Обновляем в базе
    UPDATE usage_quotas 
    SET 
      exports_today = 0,
      last_reset_date = NOW()
    WHERE user_id = user_uuid;
  END IF;
  
  -- Если данных нет, инициализируем
  IF daily_exports IS NULL THEN
    daily_exports := 0;
  END IF;
  
  -- Вычисляем время следующего сброса (завтра в полночь)
  tomorrow := DATE_TRUNC('day', NOW() + INTERVAL '1 day');
  
  -- Возвращаем результат
  RETURN QUERY SELECT 
    daily_exports as exports_today,
    limit_value as daily_limit,
    CASE 
      WHEN limit_value = -1 THEN -1
      ELSE GREATEST(0, limit_value - daily_exports)
    END as exports_remaining,
    user_plan as plan_type,
    CASE 
      WHEN limit_value = -1 THEN TRUE
      ELSE daily_exports < limit_value
    END as can_export,
    tomorrow as reset_time;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- 6. Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_usage_quotas_daily_reset 
ON usage_quotas(user_id, last_reset_date);

-- 7. Комментарии к таблице
COMMENT ON COLUMN usage_quotas.exports_today IS 'Количество экспортов сегодня';
COMMENT ON COLUMN usage_quotas.last_reset_date IS 'Дата последнего сброса дневных счетчиков';

-- 8. Предоставляем права доступа к функциям
GRANT EXECUTE ON FUNCTION increment_daily_exports(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_daily_export_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_usage_stats(UUID) TO authenticated; 