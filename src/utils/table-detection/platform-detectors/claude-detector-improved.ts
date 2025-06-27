import { domUtils } from "../common/dom-utils"
import { logger } from "../common/logging"
import { PlatformDetector } from "../types"

interface TableCandidate {
  element: Element;
  confidence: number;
  reason: string;
  isWrapper: boolean;
  containedTables: Element[];
}

/**
 * Improved detector for Claude platform with wrapper detection
 * Properly handles containers that hold real tables
 */
export const claudeDetectorImproved: PlatformDetector = {
  canDetect: (url: string): boolean => {
    return url.includes("claude.ai")
  },

  findTables: (): HTMLElement[] => {
    logger.debug("Starting Claude table detection (IMPROVED)")
    console.log("TabXport Claude IMPROVED: Starting wrapper-aware table search")

    const candidates: TableCandidate[] = [];
    
    // 1. Находим все HTML таблицы (высокий приоритет)
    findHtmlTables(candidates);
    
    // 2. Находим markdown таблицы в code блоках
    findMarkdownTables(candidates);
    
    // 3. Находим текстовые таблицы, исключая wrapper'ы
    findTextTables(candidates);
    
    // 4. Фильтруем wrapper'ы и дублирования
    const filteredCandidates = filterWrappersAndDuplicates(candidates);
    
    // 5. Финальная валидация
    const validTables = filteredCandidates
      .filter(candidate => candidate.confidence >= 0.6)
      .map(candidate => candidate.element as HTMLElement);
    
    console.log('🔍 Claude Improved: Анализ кандидатов');
    candidates.forEach((candidate, i) => {
      console.log(`${i + 1}. ${candidate.confidence.toFixed(2)} - ${candidate.reason}`, {
        element: candidate.element,
        isWrapper: candidate.isWrapper,
        containedTables: candidate.containedTables.length
      });
    });
    console.log(`✅ Итого найдено валидных таблиц: ${validTables.length} из ${candidates.length} кандидатов`);
    
    return validTables;
  },

  extractChatTitle: (): string => {
    const titleElement = document.querySelector(
      '[class*="ConversationTitle"], [class*="chat-title"]'
    )
    if (titleElement) {
      const title = domUtils.getTextContent(titleElement as HTMLElement)
      if (title && title.length > 0) {
        return title
      }
    }

    const pageTitle = document.title.replace(" - Claude", "").trim()
    return pageTitle || "Claude Conversation"
  }
}

function findHtmlTables(candidates: TableCandidate[]): void {
  document.querySelectorAll('table').forEach(table => {
    if (!isVisible(table)) return;
    
    candidates.push({
      element: table,
      confidence: 0.95, // HTML таблицы почти всегда валидны
      reason: 'HTML table',
      isWrapper: false,
      containedTables: []
    });
  });
}

function findMarkdownTables(candidates: TableCandidate[]): void {
  document.querySelectorAll('pre, code').forEach(codeBlock => {
    if (!isVisible(codeBlock)) return;
    
    const text = codeBlock.textContent || '';
    const lines = text.split('\n');
    const tableLines = lines.filter(line => line.includes('|'));
    
    if (tableLines.length >= 2) {
      const hasHeader = tableLines[1]?.includes('---') || tableLines[1]?.includes('===');
      const confidence = hasHeader ? 0.9 : 0.7;
      
      candidates.push({
        element: codeBlock,
        confidence,
        reason: `Markdown table (${tableLines.length} lines)`,
        isWrapper: false,
        containedTables: []
      });
    }
  });
}

function findTextTables(candidates: TableCandidate[]): void {
  // Ищем в div, section, article - но исключаем те, что содержат HTML таблицы
  document.querySelectorAll('div, section, article').forEach(element => {
    if (!isVisible(element)) return;
    
    // КРИТИЧНО: Проверяем, содержит ли элемент HTML таблицы
    const containedHtmlTables = Array.from(element.querySelectorAll('table'))
      .filter(table => isVisible(table));
    
    const containedCodeBlocks = Array.from(element.querySelectorAll('pre, code'))
      .filter(code => isVisible(code) && hasMarkdownTable(code));
    
    // Если содержит HTML таблицы или code блоки с таблицами - это wrapper
    if (containedHtmlTables.length > 0 || containedCodeBlocks.length > 0) {
      candidates.push({
        element,
        confidence: 0.1, // Низкая уверенность для wrapper'ов - будут отфильтрованы
        reason: `Wrapper (${containedHtmlTables.length} tables, ${containedCodeBlocks.length} code tables)`,
        isWrapper: true,
        containedTables: [...containedHtmlTables, ...containedCodeBlocks]
      });
      
      return; // Не анализируем wrapper как таблицу
    }
    
    // Анализируем как потенциальную текстовую таблицу
    const textAnalysis = analyzeTextTable(element);
    if (textAnalysis.confidence > 0) {
      candidates.push({
        element,
        confidence: textAnalysis.confidence,
        reason: textAnalysis.reason,
        isWrapper: false,
        containedTables: []
      });
    }
  });
}

function hasMarkdownTable(codeElement: Element): boolean {
  const text = codeElement.textContent || '';
  const lines = text.split('\n');
  const tableLines = lines.filter(line => line.includes('|'));
  return tableLines.length >= 2;
}

function analyzeTextTable(element: Element): { confidence: number; reason: string } {
  const text = element.textContent || '';
  const textLength = text.length;
  
  // Базовые фильтры
  if (textLength < 50) return { confidence: 0, reason: 'Too short' };
  if (textLength > 2000) return { confidence: 0, reason: 'Too long' };
  
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 3) return { confidence: 0, reason: 'Not enough lines' };
  
  // Проверяем структуру таблицы
  const tableLines = lines.filter(line => {
    const parts = line.split(/\s{2,}|\t/).filter(p => p.trim());
    return parts.length >= 2;
  });
  
  if (tableLines.length < 2) return { confidence: 0, reason: 'No table structure' };
  
  const tableRatio = tableLines.length / lines.length;
  if (tableRatio < 0.5) return { confidence: 0, reason: 'Low table ratio' };
  
  // Проверяем на layout элементы
  const className = element.className || '';
  const childrenCount = element.children.length;
  
  if (childrenCount > 10 && (className.includes('flex') || className.includes('grid'))) {
    return { confidence: 0, reason: 'Layout container' };
  }
  
  // Проверяем размер контента - большие контейнеры часто wrapper'ы
  if (textLength > 1000 && childrenCount > 5) {
    return { confidence: 0, reason: 'Large container' };
  }
  
  // Вычисляем уверенность
  let confidence = 0.3; // Базовая уверенность для текстовых таблиц
  
  if (tableRatio > 0.8) confidence += 0.3;
  if (tableLines.length >= 5) confidence += 0.2;
  if (className.includes('table')) confidence += 0.2;
  
  return {
    confidence: Math.min(confidence, 0.9), // Максимум 0.9 для текстовых
    reason: `Text table (${tableLines.length}/${lines.length} lines, ratio: ${tableRatio.toFixed(2)})`
  };
}

function filterWrappersAndDuplicates(candidates: TableCandidate[]): TableCandidate[] {
  const filtered: TableCandidate[] = [];
  
  for (const candidate of candidates) {
    // Пропускаем wrapper'ы
    if (candidate.isWrapper) {
      console.log(`🚫 Skipping wrapper with ${candidate.containedTables.length} contained tables:`, candidate.element);
      continue;
    }
    
    // Проверяем на дублирование с уже добавленными
    const isDuplicate = filtered.some(existing => {
      return areElementsEquivalent(candidate.element, existing.element);
    });
    
    if (!isDuplicate) {
      filtered.push(candidate);
    } else {
      console.log(`🚫 Skipping duplicate:`, candidate.element);
    }
  }
  
  return filtered;
}

function areElementsEquivalent(elem1: Element, elem2: Element): boolean {
  // Один и тот же элемент
  if (elem1 === elem2) return true;
  
  // Один содержит другой
  if (elem1.contains(elem2) || elem2.contains(elem1)) return true;
  
  // Очень похожий контент (первые 100 символов)
  const text1 = (elem1.textContent || '').substring(0, 100);
  const text2 = (elem2.textContent || '').substring(0, 100);
  
  if (text1.length > 50 && text2.length > 50 && text1 === text2) return true;
  
  return false;
}

function isVisible(element: Element): boolean {
  const htmlElement = element as HTMLElement;
  
  // Проверяем CSS display и visibility
  const style = window.getComputedStyle(htmlElement);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }
  
  // Проверяем размеры - но НЕ отфильтровываем скрытые/свернутые элементы
  // Элемент может быть в свернутом состоянии, но все еще валидным
  const rect = htmlElement.getBoundingClientRect();
  
  // Только полностью невидимые элементы (width = 0 AND height = 0)
  if (rect.width === 0 && rect.height === 0) {
    return false;
  }
  
  return true;
} 