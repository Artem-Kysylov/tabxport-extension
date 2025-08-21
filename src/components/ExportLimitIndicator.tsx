import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { DailyUsageStats } from '../lib/supabase/types'
import { AuthState } from '../lib/supabase/auth-service'

interface ExportLimitIndicatorProps {
  className?: string
  showDetails?: boolean
  onUpgradeClick?: () => void
}

const ExportLimitIndicator: React.FC<ExportLimitIndicatorProps> = ({
  className = '',
  showDetails = true,
  onUpgradeClick
}) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    hasGoogleAccess: false
  });
  const [usageStats, setUsageStats] = useState<DailyUsageStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuthAndLoadStats = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: "CHECK_AUTH_STATUS" });
        if (response?.success) {
          setAuthState(response.authState);
          if (response.authState.isAuthenticated) {
            await loadUsageStats(response.authState.user.id);
          }
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
        }
      } catch (error) {
        console.error("Failed to check auth status:", error);
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };
    
    checkAuthAndLoadStats();

    const interval = setInterval(checkAuthAndLoadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUsageStats = async (userId: string) => {
    try {
      setLoadingStats(true);
      const { data, error: rpcError } = await supabase.rpc('get_usage_stats', {
        user_uuid: userId
      });

      if (rpcError) throw rpcError;
      
      if (data && data.length > 0) {
        setUsageStats(data[0] as DailyUsageStats);
      } else {
        setError('No usage data found');
      }
    } catch (err) {
      console.error('Error loading usage stats:', err);
      setError('Failed to load usage statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  const formatResetTime = (resetTime: string): string => {
    const now = new Date()
    const reset = new Date(resetTime)
    const timeDiff = reset.getTime() - now.getTime()
    
    if (timeDiff <= 0) {
      return 'Now'
    }

    const hours = Math.floor(timeDiff / (1000 * 60 * 60))
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const getIndicatorColor = (): string => {
    if (!usageStats) return 'bg-gray-500'
    
    if (usageStats.plan_type === 'pro') {
      return 'bg-green-500'
    }

    const remainingPercentage = usageStats.exports_remaining / usageStats.daily_limit
    
    if (remainingPercentage > 0.6) {
      return 'bg-green-500'
    } else if (remainingPercentage > 0.3) {
      return 'bg-yellow-500'
    } else if (remainingPercentage > 0) {
      return 'bg-orange-500'
    } else {
      return 'bg-red-500'
    }
  }

  if (authState.isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    return null;
  }

  if (loadingStats) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-400">Loading stats...</span>
      </div>
    );
  }

  if (error || !usageStats) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span className="text-sm text-red-500">Error</span>
      </div>
    );
  }

  const isProPlan = usageStats.plan_type === 'pro';

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${getIndicatorColor()}`}></div>
      <div className="flex flex-col">
        {isProPlan ? (
          <span className="text-sm font-medium">
            Pro Plan
          </span>
        ) : (
          <span style={{ fontSize: "12px", fontWeight: "500" }}>
            {usageStats.exports_remaining}/{usageStats.daily_limit} exports left
          </span>
        )}
      </div>
      {!isProPlan && usageStats.exports_remaining <= 1 && onUpgradeClick && (
        <button
          onClick={onUpgradeClick}
          className="ml-auto pl-2 pr-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Upgrade
        </button>
      )}
    </div>
  );
};

export default ExportLimitIndicator;