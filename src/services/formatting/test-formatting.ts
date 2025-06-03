import { TableFormatterService, FormattingUtils } from './index';

/**
 * Простые тесты для проверки форматирования
 * НЕ ЗАПУСКАЕТСЯ АВТОМАТИЧЕСКИ - только для ручного тестирования
 */

// Тестовые данные с различными проблемами
const testData = {
  // Markdown таблица с артефактами (ChatGPT стиль)
  markdownTable: {
    headers: ['**Name**', '`Age`', '|City|'],
    rows: [
      ['John Doe', '25', '|New York|'],
      ['Jane Smith', '30', '|Los Angeles|'],
      ['**Bob Johnson**', '`35`', '|Chicago|']
    ]
  },

  // Таблица с объединенными ячейками (проблема)
  mergedCellsTable: {
    headers: ['Product', 'Q1', 'Q2'],
    rows: [
      ['Laptop', '100', '120'],
      ['Phone', '200'], // Пропущена ячейка
      ['Tablet', '150', '180', 'Extra'] // Лишняя ячейка
    ]
  },

  // Текстовая таблица Claude-стиль
  claudeTextTable: {
    headers: ['Name    ', 'Score   ', 'Grade'],
    rows: [
      ['Alice   ', '95      ', 'A'],
      ['Bob     ', '87      ', 'B'],
      ['Charlie ', '92      ', 'A-']
    ]
  },

  // Таблица с проблемами кодировки
  encodingIssuesTable: {
    headers: ['Naïve', 'Café', 'Résumé'],
    rows: [
      ['André', 'Françoís', 'José'],
      ['Müller', 'Björk', 'Åse']
    ]
  }
};

/**
 * Функция для ручного тестирования (не экспортируется)
 */
async function runManualTests() {
  console.log('🧪 TabXport: Starting manual formatting tests...');

  // Тест 1: Анализ проблем
  console.log('\n📊 Test 1: Table Analysis');
  Object.entries(testData).forEach(([name, data]) => {
    const analysis = FormattingUtils.analyzeTable(data.headers, data.rows);
    console.log(`\n${name}:`);
    console.log(`  Issues: ${analysis.issues.length}`);
    console.log(`  Suggestions: ${analysis.suggestions.length}`);
    console.log(`  Format: ${analysis.structure.detectedFormat}`);
    console.log(`  Needs formatting: ${FormattingUtils.needsFormatting(data.headers, data.rows)}`);
  });

  // Тест 2: Быстрое форматирование
  console.log('\n🚀 Test 2: Quick Formatting');
  for (const [name, data] of Object.entries(testData)) {
    console.log(`\nFormatting ${name}...`);
    try {
      const result = await FormattingUtils.quickFormat(data.headers, data.rows, 'chatgpt');
      console.log(`  Operations applied: ${result.formattingApplied.length}`);
      console.log(`  Processing time: ${result.processingTime}ms`);
      console.log(`  Headers: ${result.headers.length} -> ${result.originalHeaders.length}`);
      console.log(`  Rows: ${result.rows.length} -> ${result.originalRows.length}`);
    } catch (error) {
      console.error(`  Error: ${error}`);
    }
  }

  // Тест 3: Платформо-специфичные настройки
  console.log('\n🎯 Test 3: Platform-specific Options');
  const platforms: Array<'chatgpt' | 'claude' | 'gemini' | 'deepseek'> = ['chatgpt', 'claude', 'gemini', 'deepseek'];
  
  platforms.forEach(platform => {
    const options = FormattingUtils.getRecommendedOptions(platform);
    console.log(`\n${platform}:`);
    console.log(`  Cleaning level: ${options.cleaningLevel}`);
    console.log(`  Remove Markdown: ${options.removeMarkdownSymbols}`);
    console.log(`  Normalize diacritics: ${options.normalizeDiacritics}`);
    console.log(`  Fix merged cells: ${options.fixMergedCells}`);
  });

  console.log('\n✅ Manual tests completed!');
  console.log('📝 Note: Check console output for detailed results');
}

// Экспортируем функцию для возможности вызова в консоли браузера
if (typeof window !== 'undefined') {
  (window as any).testTabXportFormatting = runManualTests;
}

// Простые примеры использования для документации
export const examples = {
  basicUsage: async () => {
    const headers = ['**Name**', 'Age', '|City|'];
    const rows = [['John', '25', '|NYC|']];
    
    return await TableFormatterService.formatTable(headers, rows);
  },

  quickAnalysis: () => {
    const headers = ['Name', 'Age'];
    const rows = [['John'], ['Jane', '30', 'Extra']]; // Проблема: разное количество ячеек
    
    return FormattingUtils.analyzeTable(headers, rows);
  },

  platformSpecific: async () => {
    const headers = ['Task', 'Status'];
    const rows = [['**Important**', '`Done`']];
    const options = FormattingUtils.getRecommendedOptions('chatgpt');
    
    return await TableFormatterService.formatTable(headers, rows, options, 'chatgpt');
  }
}; 