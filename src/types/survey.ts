export interface SurveyOption {
  id: string
  text: string
  description?: string
  emoji?: string
}

export interface SurveyResponse {
  optionId: string
  timestamp: number
  exportContext?: {
    format?: string
    tableCount?: number
    destination?: string
    exportType?: 'single' | 'batch'
    platform?: string
  }
}

export interface SurveyData {
  surveyResponses: SurveyResponse[]
  surveySettings: {
    enabled: boolean
  }
  lastSurveyShown?: number
  lastSurveyAnswered?: number
}

export type SurveyState = 'hidden' | 'showing' | 'thanking'

// Константы
export const SURVEY_STORAGE_KEY = 'tablexport-survey-data'
export const SURVEY_COOLDOWN_MS = 24 * 60 * 60 * 1000 // 24 часа

// Опции опроса
export const SURVEY_OPTIONS: SurveyOption[] = [
  {
    id: 'very-useful',
    text: 'Очень полезно',
    description: 'Расширение значительно упростило работу',
    emoji: '🚀'
  },
  {
    id: 'useful',
    text: 'Полезно',
    description: 'Расширение помогает в работе',
    emoji: '👍'
  },
  {
    id: 'neutral',
    text: 'Нейтрально',
    description: 'Расширение работает как ожидалось',
    emoji: '😐'
  },
  {
    id: 'not-useful',
    text: 'Не очень полезно',
    description: 'Расширение имеет ограниченную пользу',
    emoji: '🤔'
  },
  {
    id: 'not-useful-at-all',
    text: 'Совсем не полезно',
    description: 'Расширение не приносит пользы',
    emoji: '👎'
  }
]

// Интерфейс для отправки на сервер
export interface SurveySubmissionData {
  optionId: string
  optionText: string
  timestamp: number
  userEmail?: string
  exportContext?: {
    format?: string
    tableCount?: number
    destination?: string
    exportType?: 'single' | 'batch'
    platform?: string
  }
}