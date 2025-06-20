-- Enhanced Supabase Schema for TableXport with PayPal & Google Drive
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE subscription_plan AS ENUM ('free', 'pro');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'trialing', 'past_due');
CREATE TYPE payment_provider AS ENUM ('paypal', 'stripe');
CREATE TYPE export_destination AS ENUM ('download', 'google_drive');

-- User profiles table (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  google_drive_enabled BOOLEAN DEFAULT FALSE,
  google_drive_folder_id TEXT, -- ID папки TableXport в Google Drive
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  plan_type subscription_plan DEFAULT 'free' NOT NULL,
  status subscription_status DEFAULT 'active' NOT NULL,
  
  -- PayPal specific fields
  paypal_subscription_id TEXT UNIQUE,
  paypal_plan_id TEXT,
  
  -- Subscription periods
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  
  -- Billing
  monthly_price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  provider payment_provider DEFAULT 'paypal' NOT NULL,
  
  -- PayPal specific fields
  paypal_payment_id TEXT,
  paypal_order_id TEXT,
  
  status TEXT DEFAULT 'pending' NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Export history table
CREATE TABLE export_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Export details
  table_name TEXT NOT NULL,
  format TEXT NOT NULL, -- csv, xlsx, docx, pdf
  row_count INTEGER DEFAULT 0,
  file_size_mb DECIMAL(10,3) DEFAULT 0,
  
  -- Source platform
  platform TEXT NOT NULL, -- 'chatgpt', 'claude', 'gemini', etc.
  
  -- Destination
  destination export_destination DEFAULT 'download' NOT NULL,
  google_drive_file_id TEXT, -- ID файла в Google Drive
  google_drive_link TEXT,    -- Ссылка на файл в Google Drive
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage quotas table
CREATE TABLE usage_quotas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Monthly limits
  exports_this_month INTEGER DEFAULT 0,
  google_drive_exports_this_month INTEGER DEFAULT 0,
  storage_used_mb DECIMAL(10,3) DEFAULT 0,
  
  -- Limits based on plan
  exports_limit INTEGER DEFAULT 10, -- Free: 10, Pro: unlimited (-1)
  google_drive_limit INTEGER DEFAULT 0, -- Free: 0, Pro: unlimited (-1)
  
  reset_date TIMESTAMP WITH TIME ZONE DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PayPal webhooks log
CREATE TABLE paypal_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_paypal_subscription ON subscriptions(paypal_subscription_id);
CREATE INDEX idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX idx_export_history_user_id ON export_history(user_id);
CREATE INDEX idx_export_history_created_at ON export_history(created_at);
CREATE INDEX idx_export_history_destination ON export_history(destination);
CREATE INDEX idx_usage_quotas_user_id ON usage_quotas(user_id);
CREATE INDEX idx_paypal_webhooks_event_id ON paypal_webhooks(event_id);
CREATE INDEX idx_paypal_webhooks_processed ON paypal_webhooks(processed);

-- Row Level Security (RLS) Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_quotas ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Users can view their own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Export history policies
CREATE POLICY "Users can view their own export history" ON export_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own export history" ON export_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usage quotas policies
CREATE POLICY "Users can view their own usage quotas" ON usage_quotas
  FOR SELECT USING (auth.uid() = user_id);

-- Functions and triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_quotas_updated_at BEFORE UPDATE ON usage_quotas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  INSERT INTO subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'free', 'active');
  
  INSERT INTO usage_quotas (user_id, exports_limit, google_drive_limit)
  VALUES (NEW.id, 10, 0); -- Free plan: 10 exports, no Google Drive
  
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Check usage limits before export
CREATE OR REPLACE FUNCTION check_export_limit(
  user_uuid UUID,
  export_destination export_destination DEFAULT 'download'
)
RETURNS BOOLEAN AS $$
DECLARE
  quota_record usage_quotas%ROWTYPE;
  subscription_record subscriptions%ROWTYPE;
BEGIN
  -- Get current usage and limits
  SELECT * INTO quota_record FROM usage_quotas WHERE user_id = user_uuid;
  SELECT * INTO subscription_record FROM subscriptions WHERE user_id = user_uuid;
  
  IF quota_record IS NULL OR subscription_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Reset monthly usage if needed
  IF quota_record.reset_date <= NOW() THEN
    UPDATE usage_quotas 
    SET 
      exports_this_month = 0,
      google_drive_exports_this_month = 0,
      reset_date = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
    WHERE user_id = user_uuid;
    quota_record.exports_this_month := 0;
    quota_record.google_drive_exports_this_month := 0;
  END IF;
  
  -- Check regular export limit
  IF quota_record.exports_limit > 0 AND quota_record.exports_this_month >= quota_record.exports_limit THEN
    RETURN FALSE;
  END IF;
  
  -- Check Google Drive specific limit
  IF export_destination = 'google_drive' THEN
    IF quota_record.google_drive_limit = 0 THEN
      RETURN FALSE; -- No Google Drive access
    END IF;
    
    IF quota_record.google_drive_limit > 0 AND quota_record.google_drive_exports_this_month >= quota_record.google_drive_limit THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Increment usage after successful export
CREATE OR REPLACE FUNCTION increment_export_usage(
  user_uuid UUID,
  export_destination export_destination DEFAULT 'download'
)
RETURNS VOID AS $$
BEGIN
  UPDATE usage_quotas 
  SET 
    exports_this_month = exports_this_month + 1,
    google_drive_exports_this_month = CASE 
      WHEN export_destination = 'google_drive' THEN google_drive_exports_this_month + 1
      ELSE google_drive_exports_this_month
    END
  WHERE user_id = user_uuid;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Upgrade user to Pro plan
CREATE OR REPLACE FUNCTION upgrade_to_pro(
  user_uuid UUID,
  paypal_sub_id TEXT,
  paypal_plan_id TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Update subscription
  UPDATE subscriptions 
  SET 
    plan_type = 'pro',
    status = 'active',
    paypal_subscription_id = paypal_sub_id,
    paypal_plan_id = paypal_plan_id,
    monthly_price = 5.00,
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '1 month'
  WHERE user_id = user_uuid;
  
  -- Update usage limits
  UPDATE usage_quotas 
  SET 
    exports_limit = -1, -- Unlimited
    google_drive_limit = -1 -- Unlimited Google Drive access
  WHERE user_id = user_uuid;
  
  -- Enable Google Drive for user
  UPDATE user_profiles 
  SET google_drive_enabled = TRUE
  WHERE user_id = user_uuid;
END;
$$ language 'plpgsql' SECURITY DEFINER; 


