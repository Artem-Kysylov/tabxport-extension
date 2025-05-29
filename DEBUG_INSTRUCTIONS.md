# 🔍 Debug Instructions - DeepSeek Title Extraction

## Проблема
DeepSeek экспортирует файлы с одинаковым названием `Into_the_Unknown_Table_timestamp.xlsx` для разных чатов.

## Что мы добавили для отладки

### 1. Улучшенное логирование
- Добавили детальные логи в `extractChatTitle()`
- Добавили логи перед и после вызова функции
- Каждый шаг теперь логируется с префиксом `TabXport:`

### 2. Тестовая страница
Создали `test-deepseek-logging.html` с:
- Симуляцией DeepSeek URL
- Тестовой таблицей
- Кнопками для отладки

## Как тестировать

### Шаг 1: Загрузите обновленное расширение
```bash
npm run build
```
Затем загрузите папку `build/chrome-mv3-prod` в Chrome.

### Шаг 2: Откройте тестовую страницу
Откройте `test-deepseek-logging.html` в браузере.

### Шаг 3: Откройте консоль разработчика
Нажмите F12 и перейдите на вкладку Console.

### Шаг 4: Экспортируйте таблицу
1. Найдите кнопку "Export" рядом с таблицей
2. Нажмите на неё
3. Следите за логами в консоли

## Что искать в логах

### Ожидаемые логи:
```
TabXport: About to extract chat title for source: deepseek
TabXport: Current URL for title extraction: https://chat.deepseek.com/...
TabXport: ===== STARTING CHAT TITLE EXTRACTION =====
TabXport: Extracting chat title for source: deepseek
TabXport: Current page URL: https://chat.deepseek.com/...
TabXport: Current page title: Into the Unknown - DeepSeek Chat
TabXport: Entering switch statement for source: deepseek
TabXport: Calling extractDeepSeekTitle()
TabXport: Starting DeepSeek title extraction
TabXport: Current URL: https://chat.deepseek.com/...
TabXport: Page title: Into the Unknown - DeepSeek Chat
TabXport: DeepSeek title from page title: Into the Unknown
TabXport: Raw extracted title: Into the Unknown
TabXport: Chat title extraction completed, result: Into the Unknown
```

### Если логи отсутствуют:
- Проверьте, что расширение загружено
- Убедитесь, что URL содержит `deepseek`
- Проверьте, что кнопка экспорта появляется

## Тестирование на реальном DeepSeek

### Шаг 1: Откройте реальный DeepSeek
Перейдите на https://chat.deepseek.com

### Шаг 2: Создайте новый чат
Создайте чат с уникальным названием.

### Шаг 3: Создайте таблицу
Попросите DeepSeek создать таблицу.

### Шаг 4: Экспортируйте
Нажмите кнопку экспорта и проверьте:
1. Логи в консоли
2. Название скачанного файла

## Возможные проблемы

### 1. Логи не появляются
- Расширение не загружено
- URL не распознается как DeepSeek
- Ошибка в коде

### 2. Название не извлекается
- Структура страницы DeepSeek изменилась
- Нужны новые селекторы
- Проблема с очисткой названия

### 3. Одинаковые названия для разных чатов
- DeepSeek использует одинаковые заголовки страниц
- Нужна стратегия извлечения из интерфейса
- Требуется fallback на первое сообщение

## Следующие шаги

После получения логов мы сможем:
1. Понять, где именно происходит сбой
2. Добавить нужные селекторы
3. Улучшить стратегию извлечения названий
4. Исправить проблему с одинаковыми названиями 