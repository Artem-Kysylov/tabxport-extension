# Extension Context Invalidation Fixes

## Проблема

В процессе работы с расширением TableXport пользователи сталкивались с ошибкой "Extension context invalidated", которая возникает когда Chrome инвалидирует контекст расширения. Это приводило к:

- Невозможности экспорта в Google Drive
- Ошибкам при работе с chrome.storage API
- Потере функциональности без понятных пользователю сообщений

## Решение

### 1. Создан новый модуль error-handlers.ts

**Файл**: `src/lib/error-handlers.ts`

Создан централизованный обработчик ошибок с:

- Автоматическим определением типа ошибки (CONTEXT_INVALIDATED, STORAGE_ERROR, AUTH_ERROR, etc.)
- Понятными пользователю сообщениями и инструкциями по исправлению
- Безопасными wrapper'ами для Chrome API операций
- Системой уведомлений для критических ошибок

**Основные функции**:
- `isContextInvalidatedError()` - детектирует ошибки инвалидации контекста
- `categorizeExtensionError()` - классифицирует ошибки с рекомендациями
- `safeStorageOperation()` - безопасные операции с storage
- `createErrorNotification()` - пользовательские уведомления

### 2. Обновлен storage.ts

**Файл**: `src/lib/storage.ts`

Все операции с Chrome Storage API теперь используют безопасные wrapper'ы:

```typescript
// Старый код
try {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.USER_SETTINGS)
  return result[STORAGE_KEYS.USER_SETTINGS] || DEFAULT_SETTINGS
} catch (error) {
  console.error("Error:", error)
  return DEFAULT_SETTINGS
}

// Новый код
const result = await safeStorageOperation(
  async () => {
    const result = await chrome.storage.sync.get(STORAGE_KEYS.USER_SETTINGS)
    return result[STORAGE_KEYS.USER_SETTINGS] || DEFAULT_SETTINGS
  },
  "getUserSettings",
  DEFAULT_SETTINGS
)

if (!result.success && result.error?.type === 'CONTEXT_INVALIDATED') {
  createErrorNotification(result.error)
}
```

### 3. Улучшен Google Drive API

**Файл**: `src/lib/google-drive-api.ts`

- Добавлена категоризация ошибок аутентификации vs контекста
- Детальное логирование для диагностики
- Понятные сообщения об ошибках для пользователя
- Безопасные операции получения токенов

### 4. Обновлены modal-handlers

**Файл**: `src/contents/components/batch-export/modal-handlers.ts`

- Создана функция `checkGoogleDriveAuthentication()` с улучшенной обработкой ошибок
- Различные сообщения для разных типов ошибок:
  - Для ошибок аутентификации: инструкции по подключению Google Drive
  - Для ошибок контекста: инструкции по перезагрузке расширения
- Таймауты для автоматического скрытия сообщений

### 5. Расширены debug функции

**Файл**: `src/contents/global-debug.ts`

Добавлены новые функции диагностики:

- `testExtensionContext()` - проверка здоровья контекста расширения
- `testStorageWithErrorHandling()` - тестирование storage с error handling
- `extensionHealthCheck()` - комплексная диагностика расширения

## Использование

### Для разработчиков

```javascript
// В консоли разработчика на любой поддерживаемой странице
TabXportDebug.extensionHealthCheck()
```

Эта функция проведет комплексную проверку:
- Состояние контекста расширения
- Доступность Chrome APIs
- Работоспособность storage
- Статус аутентификации

### Для пользователей

При возникновении ошибок пользователи теперь получают:

1. **Понятные уведомления** с описанием проблемы
2. **Четкие инструкции** по исправлению
3. **Автоматические предложения** действий

## Примеры сообщений

### Ошибка инвалидации контекста
```
❌ Extension needs to be reloaded
📝 Please reload the extension in chrome://extensions/ or refresh the page
```

### Ошибка аутентификации
```
🔐 Google Drive authentication required. Please connect Google Drive in extension settings.
📝 To connect: Open extension popup → Settings → Connect Google Drive
```

## Технические детали

### Типы ошибок

```typescript
interface ExtensionError {
  type: 'CONTEXT_INVALIDATED' | 'STORAGE_ERROR' | 'AUTH_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN'
  message: string
  recoverable: boolean
  userAction?: string
}
```

### Паттерны детектирования инвалидации контекста

```typescript
const contextInvalidatedPatterns = [
  'Extension context invalidated',
  'The extension context is invalidated',
  'extension context has been invalidated',
  'Cannot access chrome.storage',
  'chrome.storage is not available',
  'Cannot access a chrome:// URL',
  'Unchecked runtime.lastError'
]
```

## Результаты

### ✅ Исправлено
- Понятные сообщения об ошибках для пользователей
- Автоматическое детектирование проблем с контекстом
- Безопасные операции с Chrome APIs
- Улучшенная диагностика проблем

### 🔄 Улучшено
- Batch export теперь корректно обрабатывает все типы ошибок
- Кнопки обновляются быстрее при смене настроек
- Google Drive экспорт с лучшей обработкой ошибок аутентификации

### 📊 Мониторинг
- Подробные логи для диагностики
- Категоризация ошибок для аналитики
- Debug инструменты для разработчиков

## Следующие шаги

1. **Тестирование** - проверить все сценарии на разных версиях Chrome
2. **Мониторинг** - собирать статистику по типам ошибок
3. **Документация** - обновить пользовательскую документацию
4. **Автоматизация** - добавить автоматическое восстановление где возможно

## Команды для тестирования

```bash
# Сборка development версии
npm run build:chrome-dev

# Запуск в режиме разработки
npm run dev

# Получение Extension ID
npm run get-extension-id
```

В консоли разработчика:
```javascript
// Общая проверка здоровья
TabXportDebug.extensionHealthCheck()

// Проверка контекста
TabXportDebug.testExtensionContext()

// Тест storage с error handling
TabXportDebug.testStorageWithErrorHandling()

// Проверка аутентификации
TabXportDebug.checkAuth()
``` 