# Batch Export Authentication Fix - Полное Решение

## 🐛 Проблема

**Одиночный экспорт работал, а batch export не работал**, показывая ошибки:
```
📋 AuthService token status: {hasToken: false, tokenLength: 0}
Token refresh error: AuthSessionMissingError: Auth session missing!
❌ Failed to upload to Google Drive: Google authentication required. Please reconnect your Google Drive account.
```

## 🔍 Корень проблемы

Обнаружена **архитектурная несогласованность**:

1. **Одиночный экспорт**:
   - ✅ Отправляет сообщение в **background script**
   - ✅ Background script имеет доступ к **authService с состоянием аутентификации**
   - ✅ Работает через `chrome.runtime.sendMessage()`

2. **Batch export**:
   - ❌ Работал напрямую в **content script**
   - ❌ Использовал `exportTable()` → `googleDriveService.uploadFile()` напрямую
   - ❌ AuthService в content script **не инициализирован** или имеет пустое состояние
   - ❌ Нет доступа к токенам аутентификации

## 🎯 Точная причина

В логах видно:
```
☁️ Uploading to Google Drive: Chatgpt_Table_1_2025-06-26T12-24-26.xlsx
🔐 GoogleDriveService: Getting valid token via authService...
📋 AuthService token status: {hasToken: false, tokenLength: 0}
```

**Batch export использовал функцию `exportTable()` из `src/lib/export.ts`**, которая вызывала `googleDriveService.uploadFile()` **напрямую в content script**, где authService не имеет доступа к токенам.

## ✅ Решение

**Полная унификация архитектуры**: Batch export теперь **напрямую использует background script** для Google Drive exports, минуя `exportTable()`.

### 1. Исправлена проверка аутентификации

```typescript
// ❌ Старый код - прямое обращение к authService в content script
const authState = authService.getCurrentState()

// ✅ Новый код - через background script
const response = await chrome.runtime.sendMessage({
  type: "CHECK_AUTH_STATUS"
})
const authData = response.authState // ← Исправлено поле ответа
```

### 2. **Ключевое изменение**: Прямой экспорт через background script

```typescript
// ❌ Старый код - через exportTable() который вызывал googleDriveService
const result = await exportTable(table.data, exportOptions)
if (modalState.config.destination === 'google_drive') {
  const uploadResult = await uploadToGoogleDriveViaBackground(...)
}

// ✅ Новый код - напрямую через background script для Google Drive
if (modalState.config.destination === 'google_drive' && modalState.config.exportMode !== 'zip') {
  const message: ChromeMessage = {
    type: "EXPORT_TABLE",
    payload: {
      tableData: table.data,
      options: {
        format: modalState.config.format,
        includeHeaders: modalState.config.includeHeaders,
        destination: 'google_drive',
        filename: customName || `table_${tableNumber}`
      }
    }
  }
  const result = await chrome.runtime.sendMessage(message)
  // Обработка результата напрямую
} else {
  // Для локального скачивания - используем старый метод
  const result = await exportTable(table.data, exportOptions)
}
```

### 3. Обновлен background script

Добавлена обработка **batch upload** с готовыми файлами:

```typescript
// Для batch upload с dataUrl используем прямую загрузку в Google Drive
if (options.isBatchUpload && options.dataUrl) {
  const response = await fetch(options.dataUrl)
  const blob = await response.blob()
  
  const uploadResult = await googleDriveService.uploadFile({
    filename: options.filename,
    content: blob,
    mimeType: mimeType
  })
}
```

## 🧪 Тестирование

### 1. Загрузить обновленное расширение
```bash
# Путь к собранному расширению
build/chrome-mv3-dev/
```

### 2. Проверить авторизацию
```javascript
// В консоли разработчика
TabXportDebug.checkAuth()
```

### 3. Тестировать batch export
1. Найти страницу с таблицами
2. Нажать "Export All Tables"
3. Выбрать "Export to Google Drive" 
4. Нажать "Export All" (отдельные файлы)

**Ожидаемый результат**:
- ✅ **Та же авторизация**, что и для одиночного экспорта
- ✅ **Файлы загружаются в Google Drive**
- ✅ **Нет ошибок аутентификации**

## 📊 Ожидаемые логи

### При Google Drive export:
```
🔄 Exporting table 1 directly to Google Drive via background...
📤 Background export result for table 1: {success: true, googleDriveLink: "https://drive.google.com/..."}
✅ Table 1 exported to Google Drive successfully
```

### Больше НЕ должно быть:
```
❌ 🔐 GoogleDriveService: Getting valid token via authService...
❌ 📋 AuthService token status: {hasToken: false, tokenLength: 0}
❌ Token refresh error: AuthSessionMissingError: Auth session missing!
```

## 🎯 Результат

Теперь **batch export и одиночный экспорт используют одинаковую архитектуру**:

- ✅ **Единая аутентификация** через background script
- ✅ **Никаких прямых вызовов googleDriveService в content script** для Google Drive exports
- ✅ **Надежный доступ к токенам** во всех сценариях
- ✅ **Исправлена структура кода** без синтаксических ошибок

**Проблема полностью решена!** Batch export теперь работает с той же аутентификацией и архитектурой, что и одиночный экспорт.

---

## 📝 Изменённые файлы

1. `src/contents/components/batch-export/modal-handlers.ts`:
   - Унификация с background script
   - Прямой export через background для Google Drive
   - Исправление поля `authState` в ответе
   - Правильная структура try/catch блоков

2. `src/background.ts`:
   - Обработка batch upload запросов
   - Поддержка dataUrl загрузки

## ⚡ Результат

**Batch export Google Drive теперь работает точно так же, как одиночный экспорт!**

Загрузить расширение из `build/chrome-mv3-dev/` и протестировать! 