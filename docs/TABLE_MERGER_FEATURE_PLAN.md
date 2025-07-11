# 🔗 Table Merger Feature Implementation Plan

## 📝 Описание функции

**Цель**: Реализовать опциональную функцию объединения таблиц при пакетном экспорте, которая анализирует столбцы из всех выбранных таблиц и объединяет столбцы с похожими названиями в одну сводную таблицу.

**Статус**: 🚧 В планах
**Приоритет**: Medium
**Версия**: MVP

---

## 🎯 Техническая спецификация

### Входные данные
- Массив таблиц из пакетного экспорта (до 10 таблиц)
- Источники: ChatGPT, Claude, Gemini (HTML, Markdown, текстовые форматы)
- Включенная опция "Объединить похожие столбцы"

### Алгоритм объединения
1. **Нечеткое сравнение названий столбцов** (threshold ~0.7-0.8)
   - Примеры: "Цена" ≈ "Цена (руб)" ≈ "Price"
2. **Группировка похожих столбцов**
3. **Объединение данных** из сгруппированных столбцов
4. **Валидация типов данных** (избегаем конфликты)
5. **Применение аналитики** к объединенной таблице

### Результат
- **Замена оригинальных таблиц** одной объединенной таблицей
- Сохранение существующей аналитики (SUM, AVERAGE, COUNT_UNIQUE)
- Поддержка всех форматов экспорта (XLSX, CSV, Google Sheets)

---

## 📋 Чеклист реализации

### ✅ Этап 1: UI/UX изменения
- [ ] **1.1** Добавить чекбокс "Объединить похожие столбцы" в batch export modal
- [ ] **1.2** Добавить tooltip с объяснением функции
- [ ] **1.3** Обновить состояние modal для хранения настройки
- [ ] **1.4** Добавить в `BatchExportPreferences` поле `mergeSimilarColumns: boolean`

### ✅ Этап 2: Типы и интерфейсы
- [ ] **2.1** Обновить `BatchExportPreferences` в `src/contents/components/batch-export/types.ts`
- [ ] **2.2** Добавить интерфейс для результата объединения столбцов
- [ ] **2.3** Создать тип для конфигурации алгоритма сравнения
- [ ] **2.4** Добавить типы для similarity threshold и merge options

### ✅ Этап 3: Структура файлов
- [ ] **3.1** Создать `src/services/table-merger/` директорию
- [ ] **3.2** Добавить `table-merger.ts` с основной логикой
- [ ] **3.3** Добавить `similarity-utils.ts` для алгоритмов сравнения
- [ ] **3.4** Создать `types.ts` для типов объединения
- [ ] **3.5** Добавить `index.ts` для экспорта модуля

### ✅ Этап 4: Алгоритм объединения
- [ ] **4.1** Создать функцию `calculateStringSimilarity()` (Levenshtein distance)
- [ ] **4.2** Реализовать `findSimilarColumnName()` для нечеткого сравнения
- [ ] **4.3** Добавить `groupSimilarColumns()` для группировки столбцов
- [ ] **4.4** Создать `validateColumnDataTypes()` для проверки совместимости
- [ ] **4.5** Реализовать `mergeTablesWithSimilarColumns()` основную функцию

### ✅ Этап 5: Интеграция с существующим экспортом
- [ ] **5.1** Модифицировать `modal-handlers.ts` для обработки нового чекбокса
- [ ] **5.2** Обновить `combined-exporter.ts` для поддержки объединения
- [ ] **5.3** Интегрировать с существующей системой аналитики
- [ ] **5.4** Обеспечить совместимость со всеми форматами экспорта
- [ ] **5.5** Добавить логику выбора: объединенная таблица ИЛИ оригинальные

### ✅ Этап 6: Обработка ошибок и валидация
- [ ] **6.1** Валидация входных данных (минимум 2 таблицы)
- [ ] **6.2** Обработка случаев несовместимых типов данных
- [ ] **6.3** Fallback к оригинальному экспорту при ошибках
- [ ] **6.4** Добавить подробное логирование для отладки
- [ ] **6.5** Обработка edge cases (пустые таблицы, одинаковые названия)

### ✅ Этап 7: Тестирование и отладка
- [ ] **7.1** Создать тестовые случаи с разными типами таблиц
- [ ] **7.2** Проверить работу с ChatGPT/Claude/Gemini таблицами
- [ ] **7.3** Тестировать различные threshold значения (0.6, 0.7, 0.8)
- [ ] **7.4** Проверить совместимость с существующей аналитикой
- [ ] **7.5** Тестировать все форматы экспорта (XLSX, CSV, Google Sheets)

---

## 🛠 Технические детали

### Алгоритм similarity
```typescript
interface SimilarityConfig {
  threshold: number; // 0.7-0.8
  caseSensitive: boolean; // false
  ignoreSpecialChars: boolean; // true
}
```

### Структура объединенной таблицы
```typescript
interface MergedTable {
  name: string; // "Объединенная таблица"
  columns: MergedColumn[];
  sourceTableIds: string[]; // ID исходных таблиц
  mergeInfo: {
    originalColumnCount: number;
    mergedColumnCount: number;
    similarity: Record<string, string[]>; // какие столбцы объединены
  };
}
```

### UI элементы
- **Местоположение**: Batch Export Modal, раздел "Дополнительные опции"
- **Тип**: Checkbox с tooltip
- **Текст**: "🔗 Объединить похожие столбцы"
- **Tooltip**: "Автоматически объединяет столбцы с похожими названиями из всех таблиц в одну сводную таблицу"

---

## 🚧 Возможные проблемы и решения

### Проблема 1: Конфликты типов данных
**Решение**: Валидация и пропуск несовместимых столбцов с предупреждением

### Проблема 2: Низкое качество similarity
**Решение**: Настраиваемый threshold + fallback к точному совпадению

### Проблема 3: Производительность на больших таблицах
**Решение**: Ограничение на количество строк + оптимизация алгоритма

### Проблема 4: Потеря контекста исходных таблиц
**Решение**: Сохранение метаданных о источниках в объединенной таблице

---

## 📊 Критерии успеха

- [ ] ✅ Функция работает как опциональная (можно включить/выключить)
- [ ] ✅ Корректно объединяет столбцы с похожими названиями
- [ ] ✅ Сохраняет совместимость с существующей аналитикой
- [ ] ✅ Поддерживает все форматы экспорта
- [ ] ✅ Обрабатывает ошибки gracefully
- [ ] ✅ Не ломает существующий функционал пакетного экспорта

---

## 📝 Заметки по реализации

- Используем существующую инфраструктуру пакетного экспорта
- Интеграция происходит на уровне `combined-exporter.ts`
- UI изменения минимальны (один чекбокс)
- Алгоритм similarity должен быть быстрым и точным
- Fallback к оригинальному поведению обязателен

---

**Дата создания**: $(date)
**Автор**: Development Team
**Статус**: В планах → В разработке 

# Table Merger (Объединение таблиц)

## 1. Описание текущей архитектуры

- **Назначение:** объединять несколько таблиц с похожей структурой в одну, автоматически сопоставляя и сливая колонки с похожими названиями.
- **Текущий алгоритм:**
  - Сбор всех колонок из всех таблиц.
  - Группировка колонок по схожести названий (fuzzy matching + синонимы).
  - Проверка совместимости данных (типы, длина, структура).
  - Слияние колонок, если они проходят проверки.
  - Если есть конфликт (разные типы, длина, структура) — колонка не объединяется, пользователь получает предупреждение.
- **Синонимы:** поддерживаются для популярных вариантов (email, phone, name и др.), но список ограничен и требует ручного пополнения.
- **Порог схожести:** настраиваемый (по умолчанию 0.3).
- **Валидация:** строгая — если данные слишком разные, слияние не происходит.

## 2. Ограничения текущей реализации

- Не объединяет колонки, если:
  - Названия слишком разные и не попали в синонимы.
  - Типы данных не совпадают (например, строка и число).
  - Разная длина колонок или структура данных.
- Требует ручного пополнения списка синонимов для новых кейсов.
- Не анализирует содержимое колонок (только названия и типы).
- Нет поддержки мультиязычности и сложных кейсов (например, "ФИО" vs "Full Name").

## 3. План по развитию с помощью ИИ

- **Цель:** сделать объединение универсальным, масштабируемым и "умным".
- **Что нужно:**
  1. Интегрировать легковесный ИИ/ML-анализатор (например, через open-source модель или API).
  2. Анализировать не только названия, но и содержимое колонок (sample values, паттерны).
  3. Автоматически определять вероятные совпадения даже при разных языках и форматах.
  4. Предлагать пользователю варианты объединения, если есть сомнения.
  5. Вести логику "объяснимости" — почему колонки были объединены или нет.
- **Возможные технологии:**
  - OpenAI API (gpt-3.5/4, function calling)
  - Huggingface inference (tabular models, sentence transformers)
  - FastText/Word2Vec для локального семантического сравнения
  - ML-классификатор на основе обучающей выборки

## 4. Рекомендации

- Оставить текущий код в отдельной ветке (`feature/table-merge-algorithm`).
- Удалить из основной кодовой базы до появления полноценной ML/AI-реализации.
- В будущем — реализовать прототип на ИИ и провести A/B тестирование с пользователями.

---

**Ответственный:** @product, @dev

**Дата:** 2024-07-03

**Статус:** В разработке (архивировано до появления ML/AI-анализа) 