import type { UserSubscription } from '../../types';
import { supabase } from '../../lib/supabase';

export class SubscriptionService {
  public async checkSubscription(userId: string): Promise<UserSubscription | null> {
    // TODO: Implement actual subscription check
    return {
      id: userId,
      email: 'user@example.com',
      planType: 'free',
      exportsUsed: 0,
      exportsLimit: 10,
    };
  }

  public async incrementExportCount(userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_export_count', {
        user_id: userId,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error incrementing export count:', error);
      throw error;
    }
  }

  public async updateSubscription(
    userId: string,
    planType: 'free' | 'pro',
    exportsLimit: number
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          plan_type: planType,
          exports_limit: exportsLimit,
        })
        .eq('id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }
}

export default SubscriptionService; 