# 🔧 Отладка Batch Export - Диагностика проблемы

## ❗ Проблема
Кнопка batch export не обновляется автоматически при смене destination в popup настройках.

## 🛠️ Новая система диагностики

### 1. Обновленные функции для отладки

Теперь в консоли браузера доступны следующие команды:

```javascript
// Принудительное обновление всех кнопок batch export
TabXportDebug.testBatchButtonRefresh()

// Симуляция смены настроек с автоматическим обновлением
TabXportDebug.simulateSettingsChange("google_drive")
TabXportDebug.simulateSettingsChange("download")
```

### 2. Пошаговая диагностика

#### Шаг 1: Откройте Claude.ai с таблицами
- Перейдите на Claude.ai
- Убедитесь, что на странице есть кнопка "Export All Tables"

#### Шаг 2: Откройте консоль браузера
- Нажмите F12 или Ctrl+Shift+I (Cmd+Option+I на Mac)
- Перейдите на вкладку "Console"

#### Шаг 3: Проверьте текущее состояние
```javascript
// Проверить текущие настройки
chrome.storage.sync.get(["defaultDestination"]).then(console.log)

// Найти кнопки batch export
document.querySelectorAll('[class*="batch-export"]')
```

#### Шаг 4: Тестируйте обновление кнопок
```javascript
// Тест 1: Принудительное обновление
TabXportDebug.testBatchButtonRefresh()

// Тест 2: Смена на Google Drive
TabXportDebug.simulateSettingsChange("google_drive")

// Тест 3: Смена на Local Download  
TabXportDebug.simulateSettingsChange("download")
```

### 3. Что проверить в логах

После каждой команды смотрите в консоли на следующие сообщения:

✅ **Ожидаемые логи при успешной работе:**
```
🔄 refreshAllBatchExportButtons started
📥 Current destination setting: google_drive
🔍 Found 1 batch export buttons
🔧 Processing button 1: [HTMLButtonElement]
📝 Current button text: "Export 2 tables to Device"
✅ Updated button text to: "Export 2 tables to Google Drive"
🎉 refreshAllBatchExportButtons completed successfully
```

❌ **Признаки проблем:**
- `🔍 Found 0 batch export buttons` - кнопки не найдены
- `ℹ️ Button text already correct` - текст не изменился
- `❌ Error in refreshAllBatchExportButtons` - ошибка выполнения

### 4. Ручная проверка popup

1. Откройте popup расширения
2. Измените destination с "Download to Device" на "Google Drive"
3. Сразу проверьте в консоли:
```javascript
TabXportDebug.testBatchButtonRefresh()
```

### 5. Проверка автоматического обновления

1. Откройте popup и смените destination
2. Следите за логами в консоли - должны появиться сообщения:
```
📥 Settings changed: defaultDestination = google_drive
🔄 Refreshing batch export buttons due to destination change
```

## 🎯 Ожидаемый результат

После исправления:
- При смене destination в popup кнопка batch export должна **мгновенно** обновлять свой текст
- "Export X tables to Device" → "Export X tables to Google Drive"
- При клике на кнопку файлы должны экспортироваться в соответствующее место

## 📋 Чек-лист для проверки

- [ ] Кнопка batch export видна на странице
- [ ] Popup открывается и работает
- [ ] Смена destination сохраняется в настройках
- [ ] Отправляется сообщение content script при смене настроек
- [ ] Content script получает и обрабатывает сообщение
- [ ] Функция `refreshAllBatchExportButtons` находит кнопки
- [ ] Текст кнопки обновляется корректно
- [ ] Новый обработчик клика устанавливается

---

**Дата создания:** $(date)
**Статус:** В процессе диагностики 