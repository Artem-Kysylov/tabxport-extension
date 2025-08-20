-- Создание таблицы для хранения ответов опроса
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  option_id TEXT NOT NULL,
  option_text TEXT NOT NULL,
  user_email TEXT,
  export_context JSONB,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_survey_responses_submitted_at ON survey_responses(submitted_at);
CREATE INDEX IF NOT EXISTS idx_survey_responses_option_id ON survey_responses(option_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_user_email ON survey_responses(user_email);

-- RLS политики (если нужны)
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Политика для чтения (только для администраторов)
CREATE POLICY "survey_responses_read_policy" ON survey_responses
  FOR SELECT
  USING (false); -- Никто не может читать напрямую

-- Политика для вставки (через Edge Function)
CREATE POLICY "survey_responses_insert_policy" ON survey_responses
  FOR INSERT
  WITH CHECK (true); -- Разрешаем вставку через service role