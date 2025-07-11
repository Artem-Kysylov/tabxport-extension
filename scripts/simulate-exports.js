// Скрипт для симуляции экспортов и тестирования лимитов
// Запуск: node scripts/simulate-exports.js [user_id] [exports_count]

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = (color, message) => console.log(`${colors[color]}${message}${colors.reset}`);

async function simulateExports() {
  const args = process.argv.slice(2);
  let userId = args[0];
  let exportsCount = parseInt(args[1]) || 4; // По умолчанию 4 экспорта

  log('cyan', '🚀 Simulating Exports for Daily Limits Testing...\n');

  try {
    // Если не указан user_id, ищем первого пользователя
    if (!userId) {
      log('blue', '🔍 Looking for existing users...');
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name')
        .limit(1);

      if (usersError || !users || users.length === 0) {
        log('red', '❌ No users found. Please sign up in the extension first.');
        process.exit(1);
      }

      userId = users[0].user_id;
      log('green', `✅ Using user: ${users[0].full_name || 'No name'} (${userId})`);
    }

    // Показываем текущую статистику
    log('blue', '\n📊 Current usage stats:');
    const { data: beforeStats, error: beforeError } = await supabase.rpc('get_usage_stats', {
      user_uuid: userId
    });

    if (beforeError) {
      log('red', `❌ Error getting stats: ${beforeError.message}`);
      process.exit(1);
    }

    if (beforeStats && beforeStats.length > 0) {
      const stats = beforeStats[0];
      log('cyan', `   📊 Exports today: ${stats.exports_today}`);
      log('cyan', `   📈 Daily limit: ${stats.daily_limit === -1 ? 'Unlimited' : stats.daily_limit}`);
      log('cyan', `   📉 Exports remaining: ${stats.exports_remaining === -1 ? 'Unlimited' : stats.exports_remaining}`);
      log('cyan', `   🎯 Plan type: ${stats.plan_type}`);
    }

    // Симулируем экспорты
    log('blue', `\n🔄 Simulating ${exportsCount} exports...`);
    
    for (let i = 1; i <= exportsCount; i++) {
      log('yellow', `   Export ${i}/${exportsCount}...`);
      
      const { error: incrementError } = await supabase.rpc('increment_daily_exports', {
        user_uuid: userId
      });

      if (incrementError) {
        log('red', `   ❌ Error on export ${i}: ${incrementError.message}`);
        break;
      }

      // Проверяем лимиты после каждого экспорта
      const { data: limitCheck, error: limitError } = await supabase.rpc('check_daily_export_limit', {
        user_uuid: userId
      });

      if (limitError) {
        log('red', `   ❌ Error checking limits: ${limitError.message}`);
        break;
      }

      if (limitCheck && limitCheck.length > 0) {
        const limit = limitCheck[0];
        log('green', `   ✅ Export ${i} completed`);
        log('cyan', `      Can export: ${limit.can_export ? 'Yes' : 'No'}`);
        log('cyan', `      Exports today: ${limit.exports_today}`);
        log('cyan', `      Daily limit: ${limit.daily_limit === -1 ? 'Unlimited' : limit.daily_limit}`);
        
        if (!limit.can_export) {
          log('red', `   🚫 Export limit reached! Cannot export more.`);
          break;
        }
      }

      // Небольшая пауза
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Показываем финальную статистику
    log('blue', '\n📊 Final usage stats:');
    const { data: afterStats, error: afterError } = await supabase.rpc('get_usage_stats', {
      user_uuid: userId
    });

    if (afterError) {
      log('red', `❌ Error getting final stats: ${afterError.message}`);
    } else if (afterStats && afterStats.length > 0) {
      const stats = afterStats[0];
      log('cyan', `   📊 Exports today: ${stats.exports_today}`);
      log('cyan', `   📈 Daily limit: ${stats.daily_limit === -1 ? 'Unlimited' : stats.daily_limit}`);
      log('cyan', `   📉 Exports remaining: ${stats.exports_remaining === -1 ? 'Unlimited' : stats.exports_remaining}`);
      log('cyan', `   🔄 Can export: ${stats.can_export ? 'Yes' : 'No'}`);
      log('cyan', `   ⏰ Reset time: ${new Date(stats.reset_time).toLocaleString()}`);

      // Рекомендации
      if (stats.exports_remaining <= 2 && stats.exports_remaining > 0) {
        log('yellow', '\n⚠️  Warning threshold reached! Only 2 or fewer exports remaining.');
      } else if (stats.exports_remaining === 0) {
        log('red', '\n🚫 Export limit exceeded! User should see blocking message.');
      } else {
        log('green', '\n✅ User can continue exporting.');
      }
    }

    log('green', '\n🎉 Export simulation complete!');
    log('blue', '\n📋 Test the extension now:');
    log('blue', '   1. Open popup to see updated limits');
    log('blue', '   2. Try exporting a table');
    log('blue', '   3. Check for warning notifications');

  } catch (error) {
    log('red', `💥 Unexpected error: ${error.message}`);
    console.error(error);
  }
}

// Показать помощь
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
📋 Usage: node scripts/simulate-exports.js [user_id] [exports_count]

Examples:
  node scripts/simulate-exports.js                    # Auto-find user, simulate 4 exports
  node scripts/simulate-exports.js user-uuid 6       # Specific user, 6 exports
  node scripts/simulate-exports.js user-uuid 0       # Just show current stats

💡 Tip: Use 4 exports to test warning threshold (2 remaining)
💡 Tip: Use 6+ exports to test limit blocking
  `);
  process.exit(0);
}

// Запуск симуляции
simulateExports().then(() => {
  process.exit(0);
}).catch((error) => {
  log('red', `💥 Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
}); 