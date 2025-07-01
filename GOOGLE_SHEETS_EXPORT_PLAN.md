# Google Sheets Export Feature Implementation Plan

## 🎯 Цель проекта

Добавить возможность экспорта таблиц в нативный формат Google Sheets для авторизованных пользователей. Эта фича даст пользователям возможность создавать Google Spreadsheets напрямую, что улучшит совместную работу и интеграцию с Google экосистемой.

## 💡 Концепция

- **Условная доступность**: Google Sheets формат доступен только при авторизации Google Drive
- **UI интеграция**: Новая кнопка формата появляется в popup настройках и batch export modal
- **API интеграция**: Использование Google Sheets API v4 для создания spreadsheets
- **Batch поддержка**: Множественные таблицы создаются как отдельные sheets в одном spreadsheet

## 📋 Детальный план задач

### **Задача 1: Обновление OAuth и манифеста** 🔐
**Статус**: ✅ Выполнена
**Описание**: Подготовка разрешений для работы с Google Sheets API
**Действия**:
- Добавить `https://www.googleapis.com/auth/spreadsheets` в OAuth scopes
- Обновить `src/lib/supabase-google-auth.ts` с новым scope
- Обновить манифест с новыми разрешениями API
- Протестировать что авторизация работает с новыми scopes
**Файлы**: `src/lib/supabase-google-auth.ts`, `src/manifest.json`

### **Задача 2: Добавление нового типа формата** 📊
**Статус**: Не начата
**Описание**: Расширение типной системы для поддержки Google Sheets
**Действия**:
- Добавить `"google_sheets"` в `ExportFormat` type
- Обновить `EXPORT_FORMATS` константу с параметрами Google Sheets
- Добавить иконку, название и описание для нового формата
- Установить `supportsCombined: true` для batch export
**Файлы**: `src/contents/components/batch-export/types.ts`

### **Задача 3: Создание Google Sheets API сервиса** ⚙️
**Статус**: ✅ Выполнена
**Описание**: Основной сервис для взаимодействия с Google Sheets API
**Действия**:
- ✅ Создать `src/lib/google-sheets-api.ts`
- ✅ Реализовать методы:
  - `createSpreadsheet(title: string)` - создание нового spreadsheet
  - `addSheetData(spreadsheetId: string, data: TableData)` - добавление данных
  - `formatSheet(spreadsheetId: string, sheetId: number)` - форматирование
- ✅ Добавить конвертер `tableDataToSheetsFormat()`
- ✅ Протестировать создание простого spreadsheet

### **Задача 4: Обновление UI в popup настройках** 🎨
**Статус**: ✅ Выполнена
**Описание**: Добавление Google Sheets кнопки в форму настроек
**Действия**:
- ✅ Обновить `src/components/SettingsForm.tsx`
- ✅ Добавить кнопку "📊 Google Sheets" в grid форматов
- ✅ Сделать видимость зависимой от `isGoogleDriveAuthenticated`
- ✅ Добавить стили и индикацию "☁️ Cloud Native"
- ✅ Обновить логику сохранения формата
**Файлы**: `src/components/SettingsForm.tsx`

### **Задача 5: Обновление batch export modal** 📦
**Статус**: Не начата
**Описание**: Интеграция Google Sheets в modal экспорта
**Действия**:
- Обновить `createFormatSelector()` в `html-generators.ts`
- Добавить условную логику показа Google Sheets
- Обновить event handlers для нового формата
- Протестировать выбор Google Sheets в modal
**Файлы**: `src/contents/components/batch-export/html-generators.ts`

### **Задача 6: Реализация single table экспорта** 🔄
**Статус**: Не начата
**Описание**: Основной export flow для одной таблицы
**Действия**:
- Обновить `src/lib/export.ts` с Google Sheets экспортом
- Интегрировать Google Sheets API в export flow
- Обновить `export-button.ts` для поддержки нового формата
- Добавить обработку ошибок и success уведомления
- Протестировать экспорт одной таблицы в Google Sheets

### **Задача 7: Реализация batch экспорта** 📊
**Статус**: Не начата
**Описание**: Множественный экспорт таблиц в один Google Spreadsheet
**Действия**:
- Обновить batch export handlers в `modal-handlers.ts`
- Реализовать создание multiple sheets в одном spreadsheet
- Добавить прогресс индикацию для Google Sheets операций
- Обработать именование sheets (Table 1, Table 2, или custom names)
- Протестировать batch экспорт в Google Sheets

### **Задача 8: Улучшение UX и финализация** ✨
**Статус**: Не начата
**Описание**: Полировка пользовательского опыта
**Действия**:
- Добавить прямые ссылки на созданные Google Sheets
- Улучшить уведомления с кнопкой "Open in Google Sheets"
- Добавить fallback логику при недоступности Sheets API
- Реализовать sharing permissions для созданных sheets
- Финальное тестирование всех сценариев

### **Задача 9: Документация и деплой** 📚
**Статус**: Не начата
**Описание**: Документирование и финальная подготовка
**Действия**:
- Создать документацию по Google Sheets экспорту
- Обновить README с описанием новой фичи
- Добавить примеры использования
- Сборка и тестирование финальной версии
- Подготовка release notes

## 🛠️ Технические детали

### API Endpoints
- **Google Sheets API v4**: `https://sheets.googleapis.com/v4/spreadsheets`
- **Создание spreadsheet**: `POST /spreadsheets`
- **Обновление данных**: `PUT /spreadsheets/{spreadsheetId}/values/{range}`

### OAuth Scopes
```javascript
export const GOOGLE_DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile", 
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/spreadsheets" // NEW
]
```

### Структура данных
```typescript
interface SheetsExportResult {
  success: boolean
  spreadsheetId?: string
  spreadsheetUrl?: string
  error?: string
}
```

## 🎯 Success Criteria

1. ✅ Google Sheets формат доступен только авторизованным пользователям
2. ✅ Single table экспорт создает новый Google Spreadsheet
3. ✅ Batch export создает multiple sheets в одном spreadsheet  
4. ✅ Пользователи получают прямую ссылку на созданный sheet
5. ✅ Proper error handling и fallback logic
6. ✅ Совместимость с существующим export flow

## 📝 Текущий статус

**Задача 1**: ✅ Выполнена - OAuth и манифест обновлены
**Задача 2**: ✅ Выполнена - Новый тип формата добавлен
**Задача 3**: ✅ Выполнена - Google Sheets API сервис создан
**Задача 4**: ✅ Выполнена - UI popup настроек обновлен
**Следующий шаг**: Задача 5 - Обновление batch export modal
**Ответственный**: AI Assistant + User
**Timeline**: Пошаговая реализация, одна задача за раз

---

**Примечание**: Этот документ можно использовать для восстановления контекста работы над Google Sheets экспортом в любой момент. 