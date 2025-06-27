# Google Drive Authentication UX Improvement

## Overview

Этот документ описывает улучшения пользовательского интерфейса для Google Drive аутентификации, реализованные для повышения удобства использования расширения TableXport.

## Проблема

Ранее пользователи могли выбирать экспорт в Google Drive даже если они не были авторизованы, что приводило к ошибкам во время экспорта и плохому пользовательскому опыту.

## Решение

Реализованы следующие улучшения:

### 1. Destination Selector UI

Добавлен новый компонент `createDestinationSelector` в файле `src/contents/components/batch-export/html-generators.ts`:

- Отображает два варианта: "Download to Device" и "Google Drive"
- Автоматически отключает опцию Google Drive если пользователь не авторизован
- Показывает визуальную индикацию "🔒 Login Required" для неактивной опции
- Предоставляет понятные описания для каждого варианта

### 2. Автоматическая установка значения по умолчанию

В функции `loadUserSettingsForModal`:

```typescript
// Проверяем аутентификацию Google Drive перед установкой destination
const { checkGoogleDriveAuthentication } = await import("./batch-export/modal-handlers")
const authResult = await checkGoogleDriveAuthentication()
const isGoogleDriveAuthenticated = authResult.success

// Устанавливаем destination на основе аутентификации и предпочтений пользователя
if (settings.defaultDestination === "google_drive" && !isGoogleDriveAuthenticated) {
  // Если пользователь предпочитает Google Drive но не авторизован, по умолчанию download
  modalState.config.destination = "download"
  console.log("📋 Google Drive not authenticated, defaulting to download")
} else {
  modalState.config.destination = settings.defaultDestination
}
```

### 3. Динамическое обновление UI

В функции `updateModalContent`:

- Проверяет статус аутентификации Google Drive при каждом обновлении модального окна
- Автоматически переключает destination на "download" если пользователь не авторизован
- Передает статус аутентификации в HTML генератор для корректного отображения UI

### 4. Event Handlers

Добавлены обработчики событий для destination selector:

```typescript
// Destination selector
const destinationRadios = document.querySelectorAll(
  'input[name="export-destination"]'
) as NodeListOf<HTMLInputElement>
destinationRadios.forEach((radio) => {
  radio.addEventListener("change", (e) => {
    const target = e.target as HTMLInputElement
    modalState.config.destination = target.value as "download" | "google_drive"
    console.log(`🎯 Destination changed to: ${modalState.config.destination}`)
    updateModalContent(modalState, attachEventListeners).catch(console.error)
  })
})
```

## Стили

Добавлены соответствующие CSS стили в `src/contents/components/batch-export/styles.ts`:

- `.destination-selector` - контейнер для компонента
- `.destination-option` - стили для каждой опции
- `.destination-option.disabled` - стили для отключенных опций
- `.auth-required` - стиль для индикатора "Login Required"

## Технические детали

### Файлы, которые были изменены:

1. `src/contents/components/batch-export/html-generators.ts`
   - Добавлена функция `createDestinationSelector`
   - Обновлена функция `createModalContent` для приема параметра аутентификации

2. `src/contents/components/batch-export/modal-handlers.ts`
   - Обновлена функция `updateModalContent` для проверки аутентификации
   - Исправлены все вызовы асинхронной функции

3. `src/contents/components/batch-export-modal.ts`
   - Обновлена функция `loadUserSettingsForModal` для проверки аутентификации
   - Добавлены event handlers для destination selector
   - Обновлена функция `showBatchExportModal` для начальной проверки аутентификации

4. `src/contents/components/batch-export/styles.ts`
   - Добавлены CSS стили для destination selector

### Ключевые особенности:

- **Проактивная проверка**: Аутентификация проверяется при каждом обновлении UI
- **Graceful fallback**: Если Google Drive недоступен, автоматически выбирается локальное скачивание
- **Визуальная обратная связь**: Пользователи четко видят, какие опции доступны
- **Сохранение предпочтений**: Если пользователь авторизуется, их предпочтения восстанавливаются

## Результат

Теперь пользователи получают:

1. **Интуитивный интерфейс**: Сразу понятно, какие опции доступны
2. **Предотвращение ошибок**: Невозможно выбрать недоступную опцию
3. **Умные значения по умолчанию**: Автоматический выбор рабочего варианта
4. **Четкую обратную связь**: Понятно, что нужно сделать для активации Google Drive

Это значительно улучшает пользовательский опыт и снижает количество ошибок при экспорте. 