// Скрипт для сброса дневных лимитов (для тестирования)
// Запуск: node scripts/reset-limits.js [user_id]

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

async function resetLimits() {
  const args = process.argv.slice(2);
  let userId = args[0];

  log('cyan', '🔄 Resetting Daily Limits...\n');

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

    // Сбрасываем лимиты
    log('yellow', '\n🔄 Resetting daily exports count...');
    
    const { error: resetError } = await supabase
      .from('usage_quotas')
      .update({
        exports_today: 0,
        last_reset_date: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (resetError) {
      log('red', `❌ Error resetting limits: ${resetError.message}`);
      process.exit(1);
    }

    log('green', '✅ Daily limits reset successfully!');

    // Показываем новую статистику
    log('blue', '\n📊 New usage stats:');
    const { data: afterStats, error: afterError } = await supabase.rpc('get_usage_stats', {
      user_uuid: userId
    });

    if (afterError) {
      log('red', `❌ Error getting new stats: ${afterError.message}`);
    } else if (afterStats && afterStats.length > 0) {
      const stats = afterStats[0];
      log('cyan', `   📊 Exports today: ${stats.exports_today}`);
      log('cyan', `   📈 Daily limit: ${stats.daily_limit === -1 ? 'Unlimited' : stats.daily_limit}`);
      log('cyan', `   📉 Exports remaining: ${stats.exports_remaining === -1 ? 'Unlimited' : stats.exports_remaining}`);
      log('cyan', `   🔄 Can export: ${stats.can_export ? 'Yes' : 'No'}`);
      log('cyan', `   ⏰ Reset time: ${new Date(stats.reset_time).toLocaleString()}`);
    }

    log('green', '\n🎉 Reset complete! User can now export again.');
    log('blue', '\n📋 Test the extension now:');
    log('blue', '   1. Open popup to see reset limits');
    log('blue', '   2. Try exporting tables');
    log('blue', '   3. Test warning thresholds again');

  } catch (error) {
    log('red', `💥 Unexpected error: ${error.message}`);
    console.error(error);
  }
}

// Показать помощь
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
📋 Usage: node scripts/reset-limits.js [user_id]

Examples:
  node scripts/reset-limits.js                    # Auto-find user and reset
  node scripts/reset-limits.js user-uuid         # Reset specific user

💡 This script resets exports_today to 0 for testing purposes
  `);
  process.exit(0);
}

// Запуск сброса
resetLimits().then(() => {
  process.exit(0);
}).catch((error) => {
  log('red', `💥 Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
}); 