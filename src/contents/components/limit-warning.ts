// Компонент для показа предупреждений о лимитах экспорта в content script

import { authService } from "../../lib/supabase/auth-service"
import { supabase } from "../../lib/supabase"
import type { DailyUsageStats } from "../../lib/supabase/types"

interface LimitWarningData {
  exports_remaining: number
  daily_limit: number
  plan_type: string
  reset_time: string
}

// Глобальные переменные для управления показом предупреждений
let warningContainer: HTMLElement | null = null
let lastWarningShown = 0
const WARNING_COOLDOWN = 30000 // 30 секунд между предупреждениями

// Функция для получения статистики использования
const getUsageStats = async (): Promise<LimitWarningData | null> => {
  try {
    const authState = authService.getCurrentState()
    if (!authState.isAuthenticated || !authState.user) {
      return null
    }

    const { data, error } = await supabase.rpc('get_usage_stats', {
      user_uuid: authState.user.id
    })

    if (error) {
      console.error('Error getting usage stats:', error)
      return null
    }

    if (data && data.length > 0) {
      return data[0] as LimitWarningData
    }

    return null
  } catch (err) {
    console.error('Error fetching usage stats:', err)
    return null
  }
}

// Создание стилей для предупреждения
const createWarningStyles = (): string => {
  return `
    .tablexport-limit-warning {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      background: linear-gradient(135deg, #ff6b6b, #ee5a52);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(255, 107, 107, 0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      max-width: 350px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      animation: slideInRight 0.4s ease-out;
    }

    .tablexport-limit-warning-yellow {
      background: linear-gradient(135deg, #ffd93d, #f39c12);
      box-shadow: 0 8px 32px rgba(255, 217, 61, 0.3);
    }

    .tablexport-limit-warning-header {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }

    .tablexport-limit-warning-icon {
      width: 20px;
      height: 20px;
      margin-right: 8px;
      flex-shrink: 0;
    }

    .tablexport-limit-warning-title {
      font-weight: 600;
      font-size: 15px;
    }

    .tablexport-limit-warning-message {
      margin-bottom: 12px;
      line-height: 1.4;
      opacity: 0.95;
    }

    .tablexport-limit-warning-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .tablexport-limit-warning-button {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .tablexport-limit-warning-button:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-1px);
    }

    .tablexport-limit-warning-button-primary {
      background: rgba(255, 255, 255, 0.9);
      color: #333;
    }

    .tablexport-limit-warning-button-primary:hover {
      background: white;
    }

    .tablexport-limit-warning-close {
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.7);
      font-size: 18px;
      cursor: pointer;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .tablexport-limit-warning-close:hover {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }

    .tablexport-limit-warning.hiding {
      animation: slideOutRight 0.3s ease-in forwards;
    }
  `
}

// Добавление стилей в страницу
const addWarningStyles = (): void => {
  if (document.getElementById('tablexport-limit-warning-styles')) {
    return
  }

  const style = document.createElement('style')
  style.id = 'tablexport-limit-warning-styles'
  style.textContent = createWarningStyles()
  document.head.appendChild(style)
}

// Создание HTML для предупреждения
const createWarningHTML = (data: LimitWarningData): string => {
  const isWarning = data.exports_remaining <= 2 && data.exports_remaining > 0
  const isError = data.exports_remaining === 0
  
  const warningClass = isError ? 'tablexport-limit-warning' : 
                      isWarning ? 'tablexport-limit-warning tablexport-limit-warning-yellow' : 
                      'tablexport-limit-warning'

  const icon = isError ? '⚠️' : '📊'
  const title = isError ? 'Export Limit Reached' : 'Export Limit Warning'
  
  let message = ''
  if (isError) {
    message = `You've used all ${data.daily_limit} daily exports. Upgrade to Pro for unlimited exports or wait for reset.`
  } else if (isWarning) {
    message = `Only ${data.exports_remaining} export${data.exports_remaining === 1 ? '' : 's'} left today. Consider upgrading to Pro for unlimited access.`
  }

  // Форматирование времени до сброса
  const resetTime = new Date(data.reset_time)
  const now = new Date()
  const timeDiff = resetTime.getTime() - now.getTime()
  const hours = Math.floor(timeDiff / (1000 * 60 * 60))
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
  const resetText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`

  return `
    <div class="${warningClass}">
      <button class="tablexport-limit-warning-close" onclick="this.parentElement.classList.add('hiding'); setTimeout(() => this.parentElement.remove(), 300)">×</button>
      
      <div class="tablexport-limit-warning-header">
        <span class="tablexport-limit-warning-icon">${icon}</span>
        <span class="tablexport-limit-warning-title">${title}</span>
      </div>
      
      <div class="tablexport-limit-warning-message">
        ${message}
        ${data.plan_type === 'free' ? `<br><small>Resets in ${resetText}</small>` : ''}
      </div>
      
      <div class="tablexport-limit-warning-actions">
        ${data.plan_type === 'free' ? '<button class="tablexport-limit-warning-button tablexport-limit-warning-button-primary" onclick="window.open(\'https://tabxport.com/pricing\', \'_blank\')">Upgrade to Pro</button>' : ''}
        <button class="tablexport-limit-warning-button" onclick="this.parentElement.parentElement.classList.add('hiding'); setTimeout(() => this.parentElement.parentElement.remove(), 300)">Dismiss</button>
      </div>
    </div>
  `
}

// Показ предупреждения
const showLimitWarning = (data: LimitWarningData): void => {
  // Проверяем cooldown
  const now = Date.now()
  if (now - lastWarningShown < WARNING_COOLDOWN) {
    return
  }

  // Удаляем существующее предупреждение
  hideLimitWarning()

  // Добавляем стили
  addWarningStyles()

  // Создаем новое предупреждение
  warningContainer = document.createElement('div')
  warningContainer.innerHTML = createWarningHTML(data)
  document.body.appendChild(warningContainer)

  // Автоматическое скрытие через 10 секунд
  setTimeout(() => {
    hideLimitWarning()
  }, 10000)

  lastWarningShown = now
  console.log('✅ Limit warning shown:', data)
}

// Скрытие предупреждения
const hideLimitWarning = (): void => {
  if (warningContainer) {
    warningContainer.remove()
    warningContainer = null
  }
}

// Основная функция для проверки и показа предупреждений
export const checkAndShowLimitWarning = async (): Promise<void> => {
  try {
    const stats = await getUsageStats()
    if (!stats) {
      return
    }

    // Показываем предупреждение если осталось 2 или меньше экспортов
    if (stats.plan_type === 'free' && stats.exports_remaining <= 2) {
      showLimitWarning(stats)
    }
  } catch (error) {
    console.error('Error checking export limits:', error)
  }
}

// Функция для показа предупреждения при превышении лимита
export const showLimitExceededWarning = async (): Promise<void> => {
  try {
    const stats = await getUsageStats()
    if (!stats) {
      return
    }

    if (stats.plan_type === 'free' && stats.exports_remaining === 0) {
      showLimitWarning(stats)
    }
  } catch (error) {
    console.error('Error showing limit exceeded warning:', error)
  }
}

// Экспорт функций для использования в других модулях
export { hideLimitWarning } 