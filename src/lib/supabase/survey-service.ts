import { supabase } from "../supabase"
import { authService } from "./auth-service"
import type { SurveyResponse } from "../../types/survey"

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

export class SurveyService {
  /**
   * Отправляет ответ опроса на сервер и отправляет email
   */
  async submitSurveyResponse(response: SurveyResponse): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 Submitting survey response...', response)

      // Получаем информацию о пользователе
      const authState = authService.getCurrentState()
      const userEmail = authState.user?.email

      // Получаем текст выбранной опции
      const { SURVEY_OPTIONS } = await import('../../types/survey')
      const selectedOption = SURVEY_OPTIONS.find(opt => opt.id === response.optionId)
      
      const submissionData: SurveySubmissionData = {
        optionId: response.optionId,
        optionText: selectedOption?.text || response.optionId,
        timestamp: response.timestamp,
        userEmail,
        exportContext: response.exportContext
      }

      // Вызываем Edge Function для отправки email
      const { data, error } = await supabase.functions.invoke('submit-survey-response', {
        body: submissionData
      })

      if (error) {
        console.error('❌ Error submitting survey response:', error)
        return { success: false, error: error.message }
      }

      console.log('✅ Survey response submitted successfully:', data)
      return { success: true }

    } catch (error) {
      console.error('❌ Survey submission error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Отправляет ответ опроса (упрощенная версия для использования в content script)
   */
  async submitSurveyResponseSimple(optionId: string, exportContext?: any): Promise<{ success: boolean; error?: string }> {
    try {
      const response: SurveyResponse = {
        optionId,
        timestamp: Date.now(),
        exportContext
      }

      return await this.submitSurveyResponse(response)
    } catch (error) {
      console.error('❌ Simple survey submission error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
}

// Экспорт экземпляра сервиса
export const surveyService = new SurveyService()