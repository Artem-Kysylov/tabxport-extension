/**
 * Универсальная функция для вызова опроса после экспорта
 */
export const triggerPostExportSurvey = (exportContext?: {
  format?: string
  tableCount?: number
  destination?: string
  exportType?: 'single' | 'batch'
  platform?: string
}) => {
  try {
    // Проверяем есть ли глобальная функция опроса
    if (typeof window !== 'undefined' && (window as any).tablexportShowSurvey) {
      ;(window as any).tablexportShowSurvey(exportContext)
    } else {
      // Альтернативный метод через событие
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('tablexport:survey-trigger', {
          detail: exportContext
        })
        window.dispatchEvent(event)
      }
    }
  } catch (error) {
    console.error('❌ Error triggering post-export survey:', error)
  }
}

/**
 * Хелпер для создания контекста экспорта
 */
export const createExportContext = (
  format: string,
  tableCount: number = 1,
  destination: string = 'download',
  exportType: 'single' | 'batch' = 'single',
  platform?: string
) => {
  return {
    format,
    tableCount,
    destination,
    exportType,
    platform,
    timestamp: Date.now()
  }
}

/**
 * Инициализация слушателя событий для опроса
 */
export const initSurveyEventListener = () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('tablexport:survey-trigger', (event: Event) => {
      const customEvent = event as CustomEvent
      // Если глобальная функция доступна, используем её
      if ((window as any).tablexportShowSurvey) {
        ;(window as any).tablexportShowSurvey(customEvent.detail)
      }
    })
  }
}