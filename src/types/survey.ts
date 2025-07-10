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
    text: 'AI Analysis (sums, trends, anomalies)'
  },
  {
    id: 'notion-sync',
    emoji: '📌',
    text: 'Notion Synchronization'
  },
  {
    id: 'satisfied',
    emoji: '✋',
    text: 'I\'m satisfied with current features'
  }
]

export const SURVEY_STORAGE_KEY = 'tablexport_survey_data'
export const SURVEY_COOLDOWN_MS = 24 * 60 * 60 * 1000 // 24 часа 