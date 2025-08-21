/**
 * Скрипт для отключения отображения лимитов экспорта
 */

// Функция для перехвата запросов к API и подмены ответов о лимитах
function injectLimitOverride() {
  // Перехватываем сообщения расширения
  const originalSendMessage = chrome.runtime.sendMessage.bind(chrome.runtime);
  (chrome.runtime as any).sendMessage = function(message: any, ...args: any[]) {
    // Если это запрос на проверку подписки или статистики использования
    if (message && (message.type === 'CHECK_SUBSCRIPTION' || message.type === 'GET_USAGE_STATS')) {
      console.log('🔧 Intercepting subscription/usage check and injecting PRO data');

      const proResponse = {
        success: true,
        subscription: {
          id: 'pro-unlimited',
          email: 'pro@unlimited.com',
          planType: 'pro',
          exportsUsed: 0,
          exportsLimit: 999999,
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        },
        usageStats: {
          exports_today: 0,
          daily_limit: 999999,
          exports_remaining: 999999,
          plan_type: 'pro'
        }
      };

      // Если передан callback — работаем в callback-стиле
      const maybeCallback = args.find(arg => typeof arg === 'function') as ((response: any) => void) | undefined;
      if (maybeCallback) {
        try {
          maybeCallback(proResponse);
        } catch (e) {
          console.error('Callback error in limit override:', e);
        }
        return; // в callback-стиле ничего не возвращаем
      }

      // Иначе — возвращаем Promise
      return Promise.resolve(proResponse);
    }
    
    // Для всех остальных сообщений используем оригинальный метод
    return (originalSendMessage as (message: any, ...rest: any[]) => any)(message, ...args);
  };
  
  console.log('✅ Limit override installed - PRO mode activated!');
}

// Запускаем перехват при загрузке скрипта
injectLimitOverride();

// Экспортируем функцию для возможного использования в других модулях
export { injectLimitOverride };