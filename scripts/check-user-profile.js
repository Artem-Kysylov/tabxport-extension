// Check user profile settings in Supabase
// Run this in Node.js: node scripts/check-user-profile.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yuvilstnuaetzmszveqw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1dmlsc3RudWFldHptc3p2ZXF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzODAwMTksImV4cCI6MjA0OTk1NjAxOX0.VDBqvkr0VZqV9vOCJDTbVgtJIhI-6sVWKKJ3lXQZoaU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserProfile() {
  try {
    console.log('🔍 Checking user profiles...');
    
    // Get all user profiles to see current state
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return;
    }
    
    console.log(`📊 Found ${profiles.length} user profiles:`);
    
    profiles.forEach((profile, index) => {
      console.log(`\n👤 User ${index + 1}:`);
      console.log(`   ID: ${profile.id}`);
      console.log(`   Name: ${profile.full_name}`);
      console.log(`   Email: ${profile.email || 'N/A'}`);
      console.log(`   Google Drive Enabled: ${profile.google_drive_enabled ? '✅ YES' : '❌ NO'}`);
      console.log(`   Plan Type: ${profile.plan_type || 'N/A'}`);
      console.log(`   Created: ${new Date(profile.created_at).toLocaleString()}`);
    });
    
    // Check the most recent user (likely the one who just signed in)
    if (profiles.length > 0) {
      const latestUser = profiles[0];
      console.log(`\n🎯 Latest user analysis:`);
      console.log(`   Name: ${latestUser.full_name}`);
      console.log(`   Google Drive Enabled: ${latestUser.google_drive_enabled ? '✅ YES' : '❌ NO'}`);
      
      if (!latestUser.google_drive_enabled) {
        console.log(`\n⚠️  ISSUE FOUND: Google Drive is disabled for this user!`);
        console.log(`   This explains why exports go to local downloads instead of Google Drive.`);
        
        // Offer to enable Google Drive
        console.log(`\n🔧 To fix this, we need to enable Google Drive for this user.`);
        console.log(`   User ID: ${latestUser.id}`);
        
        // Enable Google Drive for this user
        console.log(`\n🔄 Enabling Google Drive for user...`);
        const { data: updateData, error: updateError } = await supabase
          .from('user_profiles')
          .update({ google_drive_enabled: true })
          .eq('id', latestUser.id)
          .select();
        
        if (updateError) {
          console.error('❌ Failed to enable Google Drive:', updateError);
        } else {
          console.log('✅ Google Drive enabled successfully!');
          console.log('Updated profile:', updateData[0]);
        }
      } else {
        console.log(`✅ Google Drive is already enabled for this user.`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function checkUsageQuotas() {
  try {
    console.log('\n🔍 Checking usage quotas...');
    
    const { data: quotas, error: quotasError } = await supabase
      .from('usage_quotas')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (quotasError) {
      console.error('❌ Error fetching quotas:', quotasError);
      return;
    }
    
    console.log(`📊 Found ${quotas.length} usage quota records:`);
    
    quotas.forEach((quota, index) => {
      console.log(`\n📈 Quota ${index + 1}:`);
      console.log(`   User ID: ${quota.user_id}`);
      console.log(`   Exports Used: ${quota.exports_used}/${quota.exports_limit}`);
      console.log(`   Google Drive Used: ${quota.google_drive_used}/${quota.google_drive_limit}`);
      console.log(`   Period: ${quota.current_period_start} to ${quota.current_period_end}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking quotas:', error);
  }
}

// Run the checks
async function main() {
  await checkUserProfile();
  await checkUsageQuotas();
}

main().catch(console.error); 