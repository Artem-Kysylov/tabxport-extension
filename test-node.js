#!/usr/bin/env node

// Тест системы форматирования через Node.js
console.log('🧪 TabXport - Тестирование системы форматирования');
console.log('================================================');

// Простая эмуляция функций для Node.js среды
const testData = {
  markdown: {
    headers: ['**Name**', '`Age`', '|City|', '~~Status~~'],
    rows: [
      ['John Doe', '25', '|New York|', '~~Active~~'],
      ['**Jane Smith**', '`30`', '|Los Angeles|'], // Пропущена ячейка
      ['Bob Johnson', '35', '|Chicago|', '**Active**', 'Extra'] // Лишняя ячейка
    ]
  },
  
  broken: {
    headers: ['ID', 'Name', 'Email'],
    rows: [
      ['1', 'John'],           // Пропущена ячейка
      ['2', 'Jane', 'jane@example.com', 'Extra'],  // Лишняя ячейка
      ['3', 'Bob', 'bob@example.com']
    ]
  },
  
  unicode: {
    headers: ['Naïve', 'Café', 'Résumé'],
    rows: [
      ['André', 'François', 'José'],
      ['Müller', 'Björk', 'Åse'],
      ['Москва', '北京', 'العربية']
    ]
  }
};

// Эмуляция основных функций форматирования
function analyzeTable(headers, rows) {
  const structure = {
    hasHeaders: headers.length > 0,
    headerRowCount: headers.length > 0 ? 1 : 0,
    columnCount: Math.max(headers.length, ...rows.map(row => row.length)),
    rowCount: rows.length,
    hasMergedCells: false,
    inconsistentColumns: rows.some(row => row.length !== headers.length),
    detectedFormat: headers.some(h => h.includes('|') || h.includes('**')) ? 'markdown' : 'text'
  };

  const issues = [];
  
  if (!structure.hasHeaders) {
    issues.push({ type: 'missing-headers', severity: 'medium', description: 'Нет заголовков' });
  }
  
  if (structure.inconsistentColumns) {
    issues.push({ type: 'inconsistent-columns', severity: 'medium', description: 'Разное количество колонок' });
  }
  
  const hasArtifacts = [...headers, ...rows.flat()].some(cell => 
    cell.includes('**') || cell.includes('`') || cell.includes('|') || cell.includes('~~')
  );
  
  if (hasArtifacts) {
    issues.push({ type: 'text-artifacts', severity: 'low', description: 'Артефакты форматирования' });
  }

  return { structure, issues };
}

function simulateFormat(headers, rows, platform = 'other') {
  const start = Date.now();
  
  // Очистка заголовков
  const cleanHeaders = headers.map(h => 
    h.replace(/\*\*/g, '')
     .replace(/`/g, '')
     .replace(/\|/g, '')
     .replace(/~~/g, '')
     .trim()
  );
  
  // Нормализация строк
  const maxCols = Math.max(cleanHeaders.length, ...rows.map(r => r.length));
  const normalizedRows = rows.map(row => {
    const newRow = [...row];
    
    // Дополняем короткие строки
    while (newRow.length < maxCols) {
      newRow.push('');
    }
    
    // Обрезаем длинные строки
    if (newRow.length > maxCols) {
      newRow.splice(maxCols);
    }
    
    // Очищаем содержимое ячеек
    return newRow.map(cell => 
      cell.replace(/\*\*/g, '')
          .replace(/`/g, '')
          .replace(/\|/g, '')
          .replace(/~~/g, '')
          .trim()
    );
  });
  
  const processingTime = Date.now() - start;
  
  return {
    headers: cleanHeaders,
    rows: normalizedRows,
    originalHeaders: headers,
    originalRows: rows,
    processingTime,
    platform,
    operations: [
      { type: 'markdown-processed', description: 'Удалены Markdown символы' },
      { type: 'structure-fixed', description: 'Нормализована структура колонок' }
    ]
  };
}

// Функция тестирования
function runTest(testName, data) {
  console.log(`\n🔬 Тест: ${testName}`);
  console.log('─'.repeat(50));
  
  // Анализ
  const analysis = analyzeTable(data.headers, data.rows);
  
  console.log('📊 Анализ:');
  console.log(`   Заголовков: ${analysis.structure.columnCount}`);
  console.log(`   Строк: ${analysis.structure.rowCount}`);
  console.log(`   Формат: ${analysis.structure.detectedFormat}`);
  console.log(`   Проблемы: ${analysis.issues.length}`);
  
  if (analysis.issues.length > 0) {
    console.log('   Список проблем:');
    analysis.issues.forEach(issue => {
      console.log(`     • ${issue.description} (${issue.severity})`);
    });
  }
  
  // Форматирование
  const platforms = ['chatgpt', 'claude', 'gemini'];
  platforms.forEach(platform => {
    const result = simulateFormat(data.headers, data.rows, platform);
    
    console.log(`\n🛠 Форматирование для ${platform}:`);
    console.log(`   Время: ${result.processingTime}мс`);
    console.log(`   Исходные заголовки: [${result.originalHeaders.map(h => `"${h}"`).join(', ')}]`);
    console.log(`   Очищенные заголовки: [${result.headers.map(h => `"${h}"`).join(', ')}]`);
    console.log(`   Операций: ${result.operations.length}`);
    
    // Показываем пример первой строки
    if (result.rows.length > 0) {
      console.log(`   Пример строки:`);
      console.log(`     До:  [${result.originalRows[0].map(c => `"${c}"`).join(', ')}]`);
      console.log(`     После: [${result.rows[0].map(c => `"${c}"`).join(', ')}]`);
    }
  });
}

// Запуск всех тестов
console.log('\n🚀 Начинаем тестирование...\n');

Object.entries(testData).forEach(([name, data]) => {
  runTest(name, data);
});

console.log('\n✅ Все тесты завершены!');
console.log('\n💡 Для тестирования в браузере откройте: test-formatting-manual.html');
console.log('💡 Для тестирования расширения загрузите build/chrome-mv3 в Chrome'); 