import React, { useState, useEffect, useRef } from 'react'
import { SurveyOption, SurveyState, SURVEY_OPTIONS } from '../types/survey'
import { SURVEY_STYLES } from './survey-styles'

interface PostExportSurveyProps {
  state: SurveyState
  onClose: () => void
  onSubmit: (optionId: string) => void
}

export const PostExportSurvey: React.FC<PostExportSurveyProps> = ({
  state,
  onClose,
  onSubmit
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // Добавляем стили в head если их нет
  useEffect(() => {
    const styleId = 'tablexport-survey-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = SURVEY_STYLES
      document.head.appendChild(style)
    }
  }, [])

  // Управление видимостью с анимацией
  useEffect(() => {
    if (state === 'showing' || state === 'thanking') {
      setIsVisible(true)
      // Запускаем анимацию появления через небольшой delay
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.classList.add('visible')
        }
      }, 50)
    } else {
      if (modalRef.current) {
        modalRef.current.classList.remove('visible')
      }
      // Скрываем элемент после анимации
      setTimeout(() => {
        setIsVisible(false)
        setSelectedOption(null)
      }, 400)
    }
  }, [state])

  // Обработка выбора опции
  const handleOptionSelect = (optionId: string) => {
    setSelectedOption(optionId)
    // Небольшая задержка для показа выбора, затем отправляем
    setTimeout(() => {
      onSubmit(optionId)
    }, 300)
  }

  // Обработка закрытия через Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (state === 'showing')) {
        onClose()
      }
    }

    if (state === 'showing') {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [state, onClose])

  if (!isVisible) {
    return null
  }

  return (
    <div className="tablexport-survey-container">
      <div 
        ref={modalRef}
        className="tablexport-survey-modal"
      >
        {state === 'showing' && (
          <>
            <div className="tablexport-survey-header">
              <h3 className="tablexport-survey-title">
                Какая функция важнее для вас?
              </h3>
              <button 
                className="tablexport-survey-close"
                onClick={onClose}
                title="Закрыть"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <div className="tablexport-survey-options">
              {SURVEY_OPTIONS.map((option: SurveyOption) => (
                <div
                  key={option.id}
                  className={`tablexport-survey-option ${selectedOption === option.id ? 'selected' : ''}`}
                  onClick={() => handleOptionSelect(option.id)}
                >
                  <div className="tablexport-survey-option-content">
                    <div className="tablexport-survey-option-emoji">
                      {option.emoji}
                    </div>
                    <div className="tablexport-survey-option-text">
                      {option.text}
                    </div>
                    <div className="tablexport-survey-radio"></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {state === 'thanking' && (
          <div className="tablexport-survey-thank-you">
            <div className="tablexport-survey-celebration">🎉</div>
            <h3 className="tablexport-survey-thank-title">
              Спасибо за отзыв!
            </h3>
            <p className="tablexport-survey-thank-subtitle">
              Вы помогаете нам делать TableXport лучше
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 