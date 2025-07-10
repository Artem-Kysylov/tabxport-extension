import { useState, useCallback } from 'react'
import { 
  SurveyData, 
  SurveyResponse, 
  SurveyState,
  SURVEY_STORAGE_KEY, 
  SURVEY_COOLDOWN_MS 
} from '../types/survey'

interface UseSurveyManagerReturn {
  surveyState: SurveyState
  canShowSurvey: () => boolean
  showSurvey: () => void
  submitResponse: (optionId: string, exportContext?: any) => void
  closeSurvey: () => void
  getSurveyStats: () => SurveyData
}

export const useSurveyManager = (): UseSurveyManagerReturn => {
  const [surveyState, setSurveyState] = useState<SurveyState>('hidden')

  // Получить данные опроса из localStorage
  const getSurveyData = useCallback((): SurveyData => {
    try {
      const stored = localStorage.getItem(SURVEY_STORAGE_KEY)
      if (!stored) {
        return {
          surveyResponses: [],
          surveySettings: { enabled: true }
        }
      }
      return JSON.parse(stored)
    } catch (error) {
      console.error('Error reading survey data:', error)
      return {
        surveyResponses: [],
        surveySettings: { enabled: true }
      }
    }
  }, [])

  // Сохранить данные опроса в localStorage
  const saveSurveyData = useCallback((data: SurveyData) => {
    try {
      localStorage.setItem(SURVEY_STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Error saving survey data:', error)
    }
  }, [])

  // Проверить, можно ли показать опрос
  const canShowSurvey = useCallback((): boolean => {
    const data = getSurveyData()
    
    // Если опросы отключены
    if (!data.surveySettings.enabled) {
      return false
    }

    const now = Date.now()
    
    // Если опрос уже был показан сегодня
    if (data.lastSurveyShown) {
      const timeSinceShown = now - data.lastSurveyShown
      if (timeSinceShown < SURVEY_COOLDOWN_MS) {
        return false
      }
    }

    // Если пользователь уже отвечал сегодня
    if (data.lastSurveyAnswered) {
      const timeSinceAnswered = now - data.lastSurveyAnswered
      if (timeSinceAnswered < SURVEY_COOLDOWN_MS) {
        return false
      }
    }

    return true
  }, [getSurveyData])

  // Показать опрос
  const showSurvey = useCallback(() => {
    if (!canShowSurvey()) {
      return
    }

    const data = getSurveyData()
    data.lastSurveyShown = Date.now()
    saveSurveyData(data)
    
    setSurveyState('showing')
  }, [canShowSurvey, getSurveyData, saveSurveyData])

  // Отправить ответ
  const submitResponse = useCallback((optionId: string, exportContext?: any) => {
    const data = getSurveyData()
    
    const response: SurveyResponse = {
      optionId,
      timestamp: Date.now(),
      exportContext
    }

    data.surveyResponses.push(response)
    data.lastSurveyAnswered = Date.now()
    saveSurveyData(data)

    setSurveyState('thanking')

    // Автоматически закрыть через 3 секунды
    setTimeout(() => {
      setSurveyState('hidden')
    }, 3000)

    // Отправить событие в аналитику (если нужно)
    try {
      // TODO: Добавить аналитику
      console.log('Survey response submitted:', response)
    } catch (error) {
      console.error('Error sending survey analytics:', error)
    }
  }, [getSurveyData, saveSurveyData])

  // Закрыть опрос
  const closeSurvey = useCallback(() => {
    setSurveyState('hidden')
  }, [])

  // Получить статистику (для дебага)
  const getSurveyStats = useCallback((): SurveyData => {
    return getSurveyData()
  }, [getSurveyData])

  return {
    surveyState,
    canShowSurvey,
    showSurvey,
    submitResponse,
    closeSurvey,
    getSurveyStats
  }
} 