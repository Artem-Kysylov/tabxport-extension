# Authentication Service Fix

## 🐛 Проблема

Пользователь видел в попапе что он авторизован ("Connected Google Drive"), но при попытке экспорта получал ошибку:
```
❌ Google Drive authentication failed: Google Drive authentication required
```

## 🔍 Причина

Обнаружено несоответствие в системе аутентификации:

1. **AuthService** сохранял токены в своем внутреннем состоянии (`this.currentState.session?.provider_token`)
2. **Проверка аутентификации** искала токены в `chrome.storage.sync` с ключами `['googleToken', 'googleRefreshToken']`
3. **Два разных места** хранения токенов приводили к рассинхронизации

## ✅ Решение

Обновил все компоненты для использования **единого источника истины** - AuthService:

### 1. Modal Handlers (`modal-handlers.ts`)
```typescript
// ❌ Старый код
const authResult = await chrome.storage.sync.get(['googleToken', 'googleRefreshToken'])

// ✅ Новый код  
const authState = authService.getCurrentState()
const googleToken = authService.getGoogleToken()
```

### 2. Google Drive API (`google-drive-api.ts`)
```typescript
// ❌ Старый код
const tokenData = await chrome.storage.sync.get(['googleToken', 'googleRefreshToken'])

// ✅ Новый код
let token = authService.getGoogleToken()
```

### 3. Debug Functions (`global-debug.ts`)
```typescript
// ❌ Старый код
const auth = await chrome.storage.sync.get(['googleToken', 'googleRefreshToken'])

// ✅ Новый код
const authState = authService.getCurrentState()
const googleToken = authService.getGoogleToken()
```

## 🧪 Тестирование

### 1. Загрузить обновленное расширение
```bash
# Путь к собранному расширению
build/chrome-mv3-dev/
```

### 2. Проверить аутентификацию
```javascript
// В консоли разработчика
TabXportDebug.checkAuth()
```

**Ожидаемый результат**: 
- ✅ Должно показать корректный статус аутентификации
- ✅ Должно найти Google токен если пользователь авторизован

### 3. Проверить экспорт в Google Drive
1. Найти таблицу на поддерживаемой странице
2. Нажать "Export All Tables" 
3. Выбрать "Export to Google Drive"
4. Нажать "Export Combined"

**Ожидаемый результат**:
- ✅ Экспорт должен начаться без ошибок аутентификации
- ✅ Файл должен появиться в Google Drive

### 4. Debug команды для диагностики
```javascript
// Полная проверка здоровья
TabXportDebug.extensionHealthCheck()

// Проверка Google Drive настроек
TabXportDebug.checkGoogleDriveSettings()

// Проверка аутентификации
TabXportDebug.checkAuth()
```

## 📊 Ожидаемые логи

### При успешной аутентификации:
```
🔍 Checking Google Drive authentication via authService...
🔍 Auth state: {
  isAuthenticated: true, 
  hasGoogleAccess: true, 
  hasUser: true, 
  hasSession: true
}
🔍 Google token check: {hasToken: true, tokenLength: 2048}
✅ Google Drive authentication verified via authService
```

### При отсутствии аутентификации:
```
🔍 Auth state: {
  isAuthenticated: false, 
  hasGoogleAccess: false, 
  hasUser: false, 
  hasSession: false
}
❌ User is not authenticated. Please sign in first.
```

## 🔧 Восстановление при проблемах

Если после обновления всё ещё есть проблемы:

1. **Перезагрузить расширение** в chrome://extensions/
2. **Обновить страницу** с таблицами
3. **Повторно авторизоваться** через попап расширения
4. **Проверить debug команды** для диагностики

## 📝 Изменённые файлы

1. `src/contents/components/batch-export/modal-handlers.ts` - основная проверка аутентификации
2. `src/lib/google-drive-api.ts` - получение токенов для API запросов  
3. `src/contents/global-debug.ts` - debug функции для проверки состояния

## 🎯 Результат

Теперь **все компоненты используют единый AuthService** для:
- ✅ Проверки состояния аутентификации
- ✅ Получения Google токенов
- ✅ Диагностики проблем

Это **устраняет рассинхронизацию** между попапом и content script, обеспечивая консистентное поведение аутентификации во всем расширении. 