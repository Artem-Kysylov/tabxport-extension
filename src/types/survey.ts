export interface SurveyOption {
  id: string
  emoji: string
  text: string
}

export interface SurveyResponse {
  optionId: string
  timestamp: number
  exportContext?: {
    format?: string
    tableCount?: number
    destination?: string
  }
}

export type SurveyState = 'hidden' | 'showing' | 'answered' | 'thanking'

export interface SurveyData {
  lastSurveyShown?: number
  lastSurveyAnswered?: number
  surveyResponses: SurveyResponse[]
  surveySettings: {
    enabled: boolean
  }
}

export const SURVEY_OPTIONS: SurveyOption[] = [
  {
    id: 'ai-analysis',
    emoji: '🤖',
    text: 'AI-анализ (суммы, тренды, аномалии)'
  },
  {
    id: 'notion-sync',
    emoji: '📌',
    text: 'Синхронизация с Notion'
  },
  {
    id: 'satisfied',
    emoji: '✋',
    text: 'Меня всё устраивает'
  }
]

export const SURVEY_STORAGE_KEY = 'tablexport_survey_data'
export const SURVEY_COOLDOWN_MS = 24 * 60 * 60 * 1000 // 24 часа 