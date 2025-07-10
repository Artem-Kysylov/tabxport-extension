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
  const triggerSurvey = () => {
    if (canShowSurvey()) {
      // Добавляем небольшую задержку для лучшего UX
      setTimeout(() => {
        showSurvey()
      }, 1500) // 1.5 секунды после экспорта
    }
  }

  // Обработка отправки ответа
  const handleSubmit = (optionId: string) => {
    submitResponse(optionId, exportContext)
  }

  // Экспортируем функцию для внешнего использования
  React.useImperativeHandle(React.useRef(), () => ({
    triggerSurvey
  }))

  // Добавляем глобальную функцию для вызова опроса
  React.useEffect(() => {
    // @ts-ignore
    window.tablexportShowSurvey = triggerSurvey
    
    return () => {
      // @ts-ignore
      delete window.tablexportShowSurvey
    }
  }, [])

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