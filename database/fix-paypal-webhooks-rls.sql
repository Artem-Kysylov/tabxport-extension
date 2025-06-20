-- Включаем RLS для paypal_webhooks таблицы
ALTER TABLE paypal_webhooks ENABLE ROW LEVEL SECURITY;

-- Создаем политику безопасности для paypal_webhooks
-- Только система может читать/писать webhooks (не пользователи)
CREATE POLICY "Service role can access paypal webhooks" ON paypal_webhooks
  USING (auth.role() = 'service_role');

-- Альтернативно, если нужен доступ для authenticated пользователей:
-- CREATE POLICY "Authenticated users can view paypal webhooks" ON paypal_webhooks
--   FOR SELECT USING (auth.role() = 'authenticated');

-- Проверяем что RLS включен
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'paypal_webhooks'; 