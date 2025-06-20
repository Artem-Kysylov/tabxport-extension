-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE subscription_plan AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'trialing');
CREATE TYPE payment_status AS ENUM ('succeeded', 'failed', 'pending', 'cancelled');

-- User profiles table (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table (PayPal version)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  plan_type subscription_plan DEFAULT 'free' NOT NULL,
  status subscription_status DEFAULT 'active' NOT NULL,
  paypal_customer_email TEXT,
  paypal_subscription_id TEXT UNIQUE,
  paypal_plan_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table (PayPal version)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  paypal_payment_id TEXT UNIQUE,
  paypal_transaction_id TEXT,
  status payment_status DEFAULT 'pending' NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Export history table
CREATE TABLE export_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  table_name TEXT NOT NULL,
  format TEXT NOT NULL,
  row_count INTEGER DEFAULT 0,
  file_size_mb DECIMAL(10,3) DEFAULT 0,
  platform TEXT, -- 'chatgpt', 'claude', 'gemini', 'deepseek'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage quotas table
CREATE TABLE usage_quotas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  exports_this_month INTEGER DEFAULT 0,
  storage_used_mb DECIMAL(10,3) DEFAULT 0,
  shared_tables_count INTEGER DEFAULT 0,
  reset_date TIMESTAMP WITH TIME ZONE DEFAULT (DATE_TRUNC('month', NOW()) + INTERVAL '1 month'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved templates table
CREATE TABLE saved_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shared tables table
CREATE TABLE shared_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  table_data JSONB NOT NULL,
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64url'),
  is_public BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_paypal_subscription ON subscriptions(paypal_subscription_id);
CREATE INDEX idx_subscriptions_paypal_customer ON subscriptions(paypal_customer_email);
CREATE INDEX idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX idx_payments_paypal_payment ON payments(paypal_payment_id);
CREATE INDEX idx_export_history_user_id ON export_history(user_id);
CREATE INDEX idx_export_history_created_at ON export_history(created_at);
CREATE INDEX idx_usage_quotas_user_id ON usage_quotas(user_id);
CREATE INDEX idx_saved_templates_user_id ON saved_templates(user_id);
CREATE INDEX idx_saved_templates_public ON saved_templates(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_shared_tables_owner_id ON shared_tables(owner_id);
CREATE INDEX idx_shared_tables_share_token ON shared_tables(share_token);
CREATE INDEX idx_shared_tables_public ON shared_tables(is_public) WHERE is_public = TRUE;

-- Row Level Security (RLS) Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_tables ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can update their own subscription" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payments policies
CREATE POLICY "Users can view their own payments" ON payments
  FOR SELECT USING (
    auth.uid() IN (
      SELECT s.user_id FROM subscriptions s WHERE s.id = payments.subscription_id
    )
  );

-- Export history policies
CREATE POLICY "Users can view their own export history" ON export_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own export history" ON export_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usage quotas policies
CREATE POLICY "Users can view their own usage quotas" ON usage_quotas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage quotas" ON usage_quotas
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage quotas" ON usage_quotas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Saved templates policies
CREATE POLICY "Users can view their own templates" ON saved_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public templates" ON saved_templates
  FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Users can manage their own templates" ON saved_templates
  FOR ALL USING (auth.uid() = user_id);

-- Shared tables policies
CREATE POLICY "Users can view their own shared tables" ON shared_tables
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can view public shared tables" ON shared_tables
  FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Anyone can view shared tables by token" ON shared_tables
  FOR SELECT USING (share_token IS NOT NULL);

CREATE POLICY "Users can manage their own shared tables" ON shared_tables
  FOR ALL USING (auth.uid() = owner_id);

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

CREATE TRIGGER update_saved_templates_updated_at BEFORE UPDATE ON saved_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shared_tables_updated_at BEFORE UPDATE ON shared_tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile and subscription on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'free', 'active');
  
  INSERT INTO usage_quotas (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to check usage limits
CREATE OR REPLACE FUNCTION check_usage_limit(
  user_uuid UUID,
  limit_type TEXT,
  current_value INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan subscription_plan;
  monthly_exports INTEGER;
  monthly_limit INTEGER;
BEGIN
  -- Get user's current plan
  SELECT s.plan_type INTO user_plan
  FROM subscriptions s
  WHERE s.user_id = user_uuid AND s.status = 'active';
  
  -- If no active subscription found, treat as free
  IF user_plan IS NULL THEN
    user_plan := 'free';
  END IF;
  
  -- Check export limit
  IF limit_type = 'exports' THEN
    SELECT uq.exports_this_month INTO monthly_exports
    FROM usage_quotas uq
    WHERE uq.user_id = user_uuid;
    
    -- Set limits based on plan
    CASE user_plan
      WHEN 'free' THEN monthly_limit := 10;
      WHEN 'pro' THEN monthly_limit := 500;
      WHEN 'enterprise' THEN RETURN TRUE; -- unlimited
    END CASE;
    
    RETURN (monthly_exports + current_value) <= monthly_limit;
  END IF;
  
  -- Default to allowing if unknown limit type
  RETURN TRUE;
END;
$$ language 'plpgsql';

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_usage(
  user_uuid UUID,
  usage_type TEXT,
  increment_value DECIMAL DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  -- Reset quotas if new month
  UPDATE usage_quotas
  SET 
    exports_this_month = 0,
    reset_date = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
  WHERE user_id = user_uuid AND reset_date <= NOW();
  
  -- Update specific usage
  CASE usage_type
    WHEN 'exports' THEN
      UPDATE usage_quotas
      SET exports_this_month = exports_this_month + increment_value::INTEGER
      WHERE user_id = user_uuid;
    WHEN 'storage' THEN
      UPDATE usage_quotas
      SET storage_used_mb = storage_used_mb + increment_value
      WHERE user_id = user_uuid;
    WHEN 'shared_tables' THEN
      UPDATE usage_quotas
      SET shared_tables_count = shared_tables_count + increment_value::INTEGER
      WHERE user_id = user_uuid;
  END CASE;
END;
$$ language 'plpgsql'; 