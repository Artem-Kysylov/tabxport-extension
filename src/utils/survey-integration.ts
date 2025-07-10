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
    console.log('📊 Triggering post-export survey with context:', exportContext)
    
    // Проверяем есть ли глобальная функция опроса
    if (typeof window !== 'undefined' && (window as any).tablexportShowSurvey) {
      console.log('✅ Global survey function found, triggering...')
      ;(window as any).tablexportShowSurvey(exportContext)
    } else {
      console.log('⚠️ Global survey function not found, trying alternative methods...')
      
      // Альтернативный метод через событие
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('tablexport:survey-trigger', {
          detail: exportContext
        })
        window.dispatchEvent(event)
        console.log('📡 Survey trigger event dispatched')
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
    window.addEventListener('tablexport:survey-trigger', (event: CustomEvent) => {
      console.log('📡 Survey trigger event received:', event.detail)
      
      // Если глобальная функция доступна, используем её
      if ((window as any).tablexportShowSurvey) {
        ;(window as any).tablexportShowSurvey(event.detail)
      }
    })
    
    console.log('✅ Survey event listener initialized')
  }
} 