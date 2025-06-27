// Диагностика ложных срабатываний в реальном времени
export interface FalsePositiveAnalysis {
  element: Element;
  reason: string;
  confidence: number;
  elementInfo: {
    tagName: string;
    className: string;
    textLength: number;
    childrenCount: number;
    hasTableChildren: boolean;
    hasCodeChildren: boolean;
  };
}

export class LiveTableDiagnosis {
  private static instance: LiveTableDiagnosis;
  
  static getInstance(): LiveTableDiagnosis {
    if (!this.instance) {
      this.instance = new LiveTableDiagnosis();
    }
    return this.instance;
  }

  async diagnoseCurrentPage(): Promise<{
    realTables: Element[];
    falsePositives: FalsePositiveAnalysis[];
    summary: string;
  }> {
    console.log('🔍 Начинаю диагностику текущей страницы...');
    
    // Импортируем детекторы
    const { detectAllTables } = await import('../utils/table-detection');
    const { findAllTables } = await import('../utils/table-detection/legacy-detector');
    
    // Запускаем оба алгоритма
    const newResults = await detectAllTables();
    const oldResults = findAllTables();
    
    console.log(`📊 Старый алгоритм: ${oldResults.length} таблиц`);
    console.log(`🆕 Новый алгоритм: ${newResults.length} таблиц`);
    
    // Анализируем каждый найденный элемент
    const realTables: Element[] = [];
    const falsePositives: FalsePositiveAnalysis[] = [];
    
    // Объединяем результаты для анализа
    const allFound = new Set([...oldResults, ...newResults]);
    
    for (const element of allFound) {
      const analysis = this.analyzeElement(element);
      
      if (this.isRealTable(element)) {
        realTables.push(element);
        this.highlightElement(element, 'green', 'НАСТОЯЩАЯ ТАБЛИЦА');
      } else {
        const falsePositive: FalsePositiveAnalysis = {
          element,
          reason: this.getFalsePositiveReason(element),
          confidence: analysis.confidence,
          elementInfo: analysis
        };
        falsePositives.push(falsePositive);
        this.highlightElement(element, 'red', `ЛОЖНОЕ СРАБАТЫВАНИЕ: ${falsePositive.reason}`);
      }
    }
    
    const summary = this.generateSummary(realTables, falsePositives);
    console.log(summary);
    
    return { realTables, falsePositives, summary };
  }

  private analyzeElement(element: Element) {
    const tagName = element.tagName.toLowerCase();
    const className = element.className || '';
    const textLength = element.textContent?.length || 0;
    const childrenCount = element.children.length;
    const hasTableChildren = element.querySelector('table') !== null;
    const hasCodeChildren = element.querySelector('pre, code') !== null;
    
    // Вычисляем уверенность
    let confidence = 0;
    
    if (tagName === 'table') confidence += 0.8;
    if (tagName === 'div' && textLength > 1000) confidence -= 0.3;
    if (hasTableChildren) confidence -= 0.5;
    if (hasCodeChildren) confidence -= 0.4;
    if (childrenCount > 10) confidence -= 0.2;
    if (className.includes('table')) confidence += 0.2;
    if (className.includes('grid') || className.includes('flex')) confidence -= 0.3;
    
    return {
      tagName,
      className,
      textLength,
      childrenCount,
      hasTableChildren,
      hasCodeChildren,
      confidence: Math.max(0, Math.min(1, confidence))
    };
  }

  private isRealTable(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    
    // HTML таблицы - почти всегда настоящие
    if (tagName === 'table') {
      return true;
    }
    
    // Проверяем на ложные срабатывания
    const textLength = element.textContent?.length || 0;
    const hasTableChildren = element.querySelector('table') !== null;
    const hasCodeChildren = element.querySelector('pre, code') !== null;
    const childrenCount = element.children.length;
    const className = element.className || '';
    
    // Ложные срабатывания
    if (hasTableChildren) return false; // Контейнер с таблицами внутри
    if (hasCodeChildren) return false; // Блок кода
    if (textLength > 1000) return false; // Слишком большой текст
    if (childrenCount > 10 && className.includes('flex')) return false; // Layout контейнер
    
    return true;
  }

  private getFalsePositiveReason(element: Element): string {
    const textLength = element.textContent?.length || 0;
    const hasTableChildren = element.querySelector('table') !== null;
    const hasCodeChildren = element.querySelector('pre, code') !== null;
    const childrenCount = element.children.length;
    const className = element.className || '';
    const tagName = element.tagName.toLowerCase();
    
    if (hasTableChildren) return 'Контейнер содержит настоящие таблицы';
    if (hasCodeChildren) return 'Блок с кодом';
    if (textLength > 1000) return `Слишком много текста (${textLength} символов)`;
    if (childrenCount > 10 && (className.includes('flex') || className.includes('grid'))) {
      return 'Layout контейнер с множественными элементами';
    }
    if (tagName === 'div' && className.includes('overflow')) return 'Overflow контейнер';
    
    return 'Неизвестная причина';
  }

  private highlightElement(element: Element, color: string, label: string): void {
    const htmlElement = element as HTMLElement;
    htmlElement.style.border = `3px solid ${color}`;
    htmlElement.style.position = 'relative';
    
    // Добавляем лейбл
    const labelEl = document.createElement('div');
    labelEl.textContent = label;
    labelEl.style.cssText = `
      position: absolute;
      top: -25px;
      left: 0;
      background: ${color};
      color: white;
      padding: 2px 8px;
      font-size: 12px;
      font-weight: bold;
      z-index: 10000;
      border-radius: 3px;
    `;
    
    htmlElement.appendChild(labelEl);
    
    // Убираем через 10 секунд
    setTimeout(() => {
      htmlElement.style.border = '';
      labelEl.remove();
    }, 10000);
  }

  private generateSummary(realTables: Element[], falsePositives: FalsePositiveAnalysis[]): string {
    let summary = `\n📋 РЕЗУЛЬТАТЫ ДИАГНОСТИКИ:\n`;
    summary += `✅ Настоящих таблиц: ${realTables.length}\n`;
    summary += `❌ Ложных срабатываний: ${falsePositives.length}\n\n`;
    
    if (falsePositives.length > 0) {
      summary += `🔴 ЛОЖНЫЕ СРАБАТЫВАНИЯ:\n`;
      falsePositives.forEach((fp, index) => {
        summary += `${index + 1}. ${fp.elementInfo.tagName.toUpperCase()}`;
        if (fp.elementInfo.className) {
          summary += ` (class: ${fp.elementInfo.className.substring(0, 30)}...)`;
        }
        summary += `\n   Причина: ${fp.reason}\n`;
        summary += `   Текст: ${fp.elementInfo.textLength} символов, Дети: ${fp.elementInfo.childrenCount}\n`;
        summary += `   Уверенность: ${(fp.confidence * 100).toFixed(1)}%\n\n`;
      });
    }
    
    return summary;
  }

  clearHighlights(): void {
    // Убираем все подсветки
    document.querySelectorAll('[style*="border: 3px solid"]').forEach(el => {
      (el as HTMLElement).style.border = '';
      el.querySelectorAll('[style*="position: absolute"][style*="top: -25px"]').forEach(label => {
        label.remove();
      });
    });
  }
}

// Глобальная функция для быстрого запуска
declare global {
  interface Window {
    TabXportLiveDiagnosis?: () => Promise<void>;
    TabXportClearHighlights?: () => void;
  }
}

if (typeof window !== 'undefined') {
  window.TabXportLiveDiagnosis = async () => {
    const diagnosis = LiveTableDiagnosis.getInstance();
    await diagnosis.diagnoseCurrentPage();
  };
  
  window.TabXportClearHighlights = () => {
    const diagnosis = LiveTableDiagnosis.getInstance();
    diagnosis.clearHighlights();
  };
} 