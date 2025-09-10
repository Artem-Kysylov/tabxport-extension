import React from 'react'
import { useSurveyManager } from '../hooks/useSurveyManager'
import { PostExportSurvey } from './PostExportSurvey'

interface SurveyManagerProps {
  exportContext?: {
    format?: string
    tableCount?: number
    destination?: string
  }
}

export const SurveyManager: React.FC<SurveyManagerProps> = ({ exportContext }) => {
  const {
    surveyState,
    showSurvey,
    submitResponse,
    closeSurvey,
    canShowSurvey
  } = useSurveyManager()

  // Функция для показа опроса после экспорта
  const triggerSurvey = React.useCallback((context?: any) => {
    if (canShowSurvey()) {
      // Добавляем небольшую задержку для лучшего UX
      setTimeout(() => {
        showSurvey()
      }, 1500) // 1.5 секунды после экспорта
    }
  }, [canShowSurvey, showSurvey])

  // Обработка отправки ответа
  const handleSubmit = React.useCallback((optionId: string) => {
    submitResponse(optionId, exportContext)
  }, [submitResponse, exportContext])

  // Добавляем глобальную функцию для вызова опроса
  React.useEffect(() => {
    // @ts-ignore
    window.tablexportShowSurvey = triggerSurvey
    
    // Слушатель событий для универсального вызова
    const handleSurveyTrigger = (event: CustomEvent) => {
      triggerSurvey(event.detail)
    }
    
    window.addEventListener('tablexport:survey-trigger', handleSurveyTrigger as EventListener)
    
    return () => {
      // @ts-ignore
      delete window.tablexportShowSurvey
      window.removeEventListener('tablexport:survey-trigger', handleSurveyTrigger as EventListener)
    }
  }, [triggerSurvey])

  return (
    <PostExportSurvey
      state={surveyState}
      onClose={closeSurvey}
      onSubmit={handleSubmit}
    />
  )
}

// Хук для удобного использования в других компонентах
export const useSurveyTrigger = () => {
  const { canShowSurvey, showSurvey } = useSurveyManager()
  
  const triggerSurvey = (exportContext?: any) => {
    if (canShowSurvey()) {
      setTimeout(() => {
        showSurvey()
      }, 1500)
    }
  }

  return { triggerSurvey, canShowSurvey }
}

// Функция для vanilla JS инициализации без React
export const initVanillaSurveyManager = () => {
  console.log('🗳️ Initializing vanilla survey manager...')
  
  // Импортируем хук и создаем управление состоянием
  let surveyState: any = 'hidden'
  let surveyManager: any = null
  
  // Функция для создания survey через vanilla JS (упрощенная версия)
  const createVanillaSurvey = async (context?: any) => {
    try {
      const { useSurveyManager } = await import('../hooks/useSurveyManager')
      
      // Используем хук в callback для получения функций
      const triggerSurvey = () => {
        // Показываем опрос через событие
        const event = new CustomEvent('tablexport:survey-show', { detail: context })
        window.dispatchEvent(event)
      }
      return triggerSurvey
    } catch (error) {
      console.error('❌ Failed to create vanilla survey:', error)
      return null
    }
  }
  
  // Глобальная функция для вызова опроса
  const globalTriggerSurvey = async (context?: any) => {
    const triggerFn = await createVanillaSurvey(context)
    if (triggerFn) {
      triggerFn()
    }
  }
  
  // @ts-ignore
  window.tablexportShowSurvey = globalTriggerSurvey
  
  console.log('✅ Vanilla survey manager initialized')
}