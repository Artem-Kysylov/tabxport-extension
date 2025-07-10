import { 
  SurveyState, 
  SURVEY_OPTIONS, 
  SURVEY_STORAGE_KEY, 
  SURVEY_COOLDOWN_MS 
} from '../types/survey'

/**
 * Vanilla JS Survey Manager for Content Script
 */
class ContentSurveyManager {
  private surveyState: SurveyState = 'hidden'
  private surveyContainer: HTMLElement | null = null

  // Получить данные опроса из localStorage
  private getSurveyData() {
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
  }

  // Сохранить данные опроса в localStorage
  private saveSurveyData(data: any) {
    try {
      localStorage.setItem(SURVEY_STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Error saving survey data:', error)
    }
  }

  // Проверить, можно ли показать опрос
  private canShowSurvey(): boolean {
    const data = this.getSurveyData()
    
    if (!data.surveySettings.enabled) {
      return false
    }

    const now = Date.now()
    
    if (data.lastSurveyShown) {
      const timeSinceShown = now - data.lastSurveyShown
      if (timeSinceShown < SURVEY_COOLDOWN_MS) {
        return false
      }
    }

    if (data.lastSurveyAnswered) {
      const timeSinceAnswered = now - data.lastSurveyAnswered
      if (timeSinceAnswered < SURVEY_COOLDOWN_MS) {
        return false
      }
    }

    return true
  }

  // Создать HTML для опроса
  private createSurveyHTML(): string {
    return `
      <div class="tablexport-survey-container" id="tablexport-survey-container" style="display: none;">
        <div class="tablexport-survey-modal" id="tablexport-survey-modal">
          <div id="tablexport-survey-content">
            <div class="tablexport-survey-header">
              <h3 class="tablexport-survey-title">
                Which feature matters most to you?
              </h3>
              <button class="tablexport-survey-close" id="tablexport-survey-close" title="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div class="tablexport-survey-options">
              ${SURVEY_OPTIONS.map(option => `
                <div class="tablexport-survey-option" data-option-id="${option.id}">
                  <div class="tablexport-survey-option-content">
                    <div class="tablexport-survey-option-emoji">${option.emoji}</div>
                    <div class="tablexport-survey-option-text">${option.text}</div>
                    <div class="tablexport-survey-radio"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          <div id="tablexport-survey-thank-you" style="display: none;">
            <div class="tablexport-survey-thank-you">
              <div class="tablexport-survey-celebration">🎉</div>
              <h3 class="tablexport-survey-thank-title">
                Thank you for your feedback!
              </h3>
              <p class="tablexport-survey-thank-subtitle">
                You're helping us make TableXport better
              </p>
            </div>
          </div>
        </div>
      </div>
    `
  }

  // Добавить CSS стили
  private addStyles() {
    const styleId = 'tablexport-survey-styles'
    if (document.getElementById(styleId)) {
      return
    }

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      /* Survey Styles */
      .tablexport-survey-container {
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 10000;
        font-family: system-ui, -apple-system, sans-serif;
        pointer-events: none;
      }

      .tablexport-survey-modal {
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        padding: 24px;
        width: 320px;
        max-width: calc(100vw - 40px);
        pointer-events: auto;
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .tablexport-survey-modal.visible {
        transform: translateY(0);
        opacity: 1;
      }

      .tablexport-survey-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;
      }

      .tablexport-survey-title {
        font-size: 16px;
        font-weight: 600;
        color: #062013;
        margin: 0;
        line-height: 1.3;
        flex: 1;
        padding-right: 12px;
      }

      .tablexport-survey-close {
        width: 24px;
        height: 24px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: background-color 0.2s;
        flex-shrink: 0;
      }

      .tablexport-survey-close:hover {
        background-color: #f3f4f6;
      }

      .tablexport-survey-options {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .tablexport-survey-option {
        position: relative;
        cursor: pointer;
        border: 1px solid #d1d5db;
        border-radius: 10px;
        padding: 14px 16px;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        background: white;
      }

      .tablexport-survey-option:hover {
        border-color: #1B9358;
        background-color: #f8fdf9;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(27, 147, 88, 0.15);
      }

      .tablexport-survey-option.selected {
        border-color: #1B9358;
        background-color: #f0f9ff;
        box-shadow: 0 0 0 2px rgba(27, 147, 88, 0.2);
      }

      .tablexport-survey-option-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .tablexport-survey-option-emoji {
        font-size: 20px;
        line-height: 1;
        flex-shrink: 0;
      }

      .tablexport-survey-option-text {
        font-size: 14px;
        color: #062013;
        line-height: 1.4;
        flex: 1;
      }

      .tablexport-survey-radio {
        width: 18px;
        height: 18px;
        border: 2px solid #d1d5db;
        border-radius: 50%;
        background: white;
        position: relative;
        flex-shrink: 0;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .tablexport-survey-option:hover .tablexport-survey-radio {
        border-color: #1B9358;
      }

      .tablexport-survey-option.selected .tablexport-survey-radio {
        border-color: #1B9358;
        background-color: #1B9358;
      }

      .tablexport-survey-option.selected .tablexport-survey-radio::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 6px;
        height: 6px;
        background: white;
        border-radius: 50%;
      }

      .tablexport-survey-thank-you {
        text-align: center;
        padding: 20px 0;
      }

      .tablexport-survey-celebration {
        font-size: 48px;
        margin-bottom: 16px;
        animation: tablexport-bounce 0.6s ease-out;
      }

      .tablexport-survey-thank-title {
        font-size: 16px;
        font-weight: 600;
        color: #062013;
        margin: 0 0 8px 0;
      }

      .tablexport-survey-thank-subtitle {
        font-size: 14px;
        color: #6b7280;
        margin: 0;
        line-height: 1.4;
      }

      @keyframes tablexport-bounce {
        0%, 20%, 53%, 80%, 100% {
          transform: translate3d(0, 0, 0);
        }
        40%, 43% {
          transform: translate3d(0, -12px, 0);
        }
        70% {
          transform: translate3d(0, -6px, 0);
        }
        90% {
          transform: translate3d(0, -2px, 0);
        }
      }

      @media (max-width: 480px) {
        .tablexport-survey-container {
          bottom: 16px;
          left: 16px;
          right: 16px;
        }

        .tablexport-survey-modal {
          width: 100%;
          max-width: none;
          padding: 20px;
        }
      }
    `
    document.head.appendChild(style)
  }

  // Показать опрос
  public showSurvey(exportContext?: any) {
    if (!this.canShowSurvey()) {
      console.log('📊 Survey cannot be shown (cooldown or disabled)')
      return
    }

    // Отмечаем что опрос показан
    const data = this.getSurveyData()
    data.lastSurveyShown = Date.now()
    this.saveSurveyData(data)

    if (!this.surveyContainer) {
      this.createSurveyContainer()
    }

    const container = document.getElementById('tablexport-survey-container')
    const modal = document.getElementById('tablexport-survey-modal')
    const content = document.getElementById('tablexport-survey-content')
    const thankYou = document.getElementById('tablexport-survey-thank-you')

    if (container && modal && content && thankYou) {
      // Показываем survey content, скрываем thank you
      content.style.display = 'block'
      thankYou.style.display = 'none'
      
      // Показываем контейнер
      container.style.display = 'block'
      
      // Анимация появления
      setTimeout(() => {
        modal.classList.add('visible')
      }, 50)

      this.surveyState = 'showing'
      console.log('✅ Survey shown successfully')
    }
  }

  // Создать survey container в DOM
  private createSurveyContainer() {
    this.addStyles()
    
    const existingContainer = document.getElementById('tablexport-survey-container')
    if (existingContainer) {
      existingContainer.remove()
    }

    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = this.createSurveyHTML()
    const surveyContainer = tempDiv.firstElementChild as HTMLElement
    
    document.body.appendChild(surveyContainer)
    this.surveyContainer = surveyContainer

    this.attachEventListeners()
  }

  // Прикрепить обработчики событий
  private attachEventListeners() {
    // Обработчик закрытия
    const closeBtn = document.getElementById('tablexport-survey-close')
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeSurvey())
    }

    // Обработчики выбора опции
    const options = document.querySelectorAll('.tablexport-survey-option')
    options.forEach(option => {
      option.addEventListener('click', (e) => {
        const optionId = (e.currentTarget as HTMLElement).getAttribute('data-option-id')
        if (optionId) {
          this.selectOption(optionId)
        }
      })
    })

    // Закрытие по Escape
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.surveyState === 'showing') {
        this.closeSurvey()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
  }

  // Выбрать опцию
  private selectOption(optionId: string) {
    // Визуально выделяем выбранную опцию
    const options = document.querySelectorAll('.tablexport-survey-option')
    options.forEach(option => {
      option.classList.remove('selected')
    })

    const selectedOption = document.querySelector(`[data-option-id="${optionId}"]`)
    if (selectedOption) {
      selectedOption.classList.add('selected')
    }

    // Сохраняем ответ
    setTimeout(() => {
      this.submitResponse(optionId)
    }, 300)
  }

  // Отправить ответ
  private submitResponse(optionId: string) {
    const data = this.getSurveyData()
    
    const response = {
      optionId,
      timestamp: Date.now()
    }

    data.surveyResponses.push(response)
    data.lastSurveyAnswered = Date.now()
    this.saveSurveyData(data)

    // Показываем thank you экран
    this.showThankYou()

    console.log('📊 Survey response submitted:', response)
  }

  // Показать thank you экран
  private showThankYou() {
    const content = document.getElementById('tablexport-survey-content')
    const thankYou = document.getElementById('tablexport-survey-thank-you')

    if (content && thankYou) {
      content.style.display = 'none'
      thankYou.style.display = 'block'
    }

    this.surveyState = 'thanking'

    // Автозакрытие через 3 секунды
    setTimeout(() => {
      this.closeSurvey()
    }, 3000)
  }

  // Закрыть опрос
  public closeSurvey() {
    const container = document.getElementById('tablexport-survey-container')
    const modal = document.getElementById('tablexport-survey-modal')

    if (modal) {
      modal.classList.remove('visible')
    }

    setTimeout(() => {
      if (container) {
        container.style.display = 'none'
      }
      this.surveyState = 'hidden'
    }, 400)
  }
}

// Глобальный экземпляр survey manager
let globalSurveyManager: ContentSurveyManager | null = null

// Инициализация survey manager
export const initContentSurveyManager = () => {
  if (!globalSurveyManager) {
    globalSurveyManager = new ContentSurveyManager()
    
    // Добавляем глобальную функцию для вызова опроса
    ;(window as any).tablexportShowSurvey = (exportContext?: any) => {
      console.log('📊 Triggering survey with context:', exportContext)
      globalSurveyManager?.showSurvey(exportContext)
    }
    
    // Слушатель событий
    window.addEventListener('tablexport:survey-trigger', (event: CustomEvent) => {
      console.log('📡 Survey trigger event received:', event.detail)
      globalSurveyManager?.showSurvey(event.detail)
    })
    
    console.log('✅ Content Survey Manager initialized')
  }
}

// Экспорт для использования в других модулях
export const triggerSurvey = (exportContext?: any) => {
  globalSurveyManager?.showSurvey(exportContext)
} 