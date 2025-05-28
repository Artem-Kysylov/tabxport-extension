import React, { useState, useEffect } from 'react';
import type { UserSubscription } from '../types';
import { getUserSubscription } from '../lib/storage';

interface SubscriptionStatusProps {
  onUpgradeClick?: () => void;
}

const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({ onUpgradeClick }) => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const userSubscription = await getUserSubscription();
        setSubscription(userSubscription);
      } catch (error) {
        console.error('Failed to load subscription:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSubscription();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Default free subscription if no subscription found
  const currentSubscription: UserSubscription = subscription || {
    id: 'free-user',
    email: 'user@example.com',
    planType: 'free',
    exportsUsed: 0,
    exportsLimit: 10,
  };

  const isProUser = currentSubscription.planType === 'pro';
  const usagePercentage = (currentSubscription.exportsUsed / currentSubscription.exportsLimit) * 100;

  return (
    <div className={`rounded-lg p-4 ${isProUser ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200' : 'bg-gray-50 border border-gray-200'}`}>
      {/* Plan Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isProUser 
              ? 'bg-purple-100 text-purple-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {isProUser ? '👑 Pro' : '🆓 Free'}
          </span>
          {isProUser && (
            <span className="text-xs text-purple-600">
              ✨ All features unlocked
            </span>
          )}
        </div>
      </div>

      {/* Usage Stats for Free Users */}
      {!isProUser && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">Exports this month</span>
            <span className="font-medium">
              {currentSubscription.exportsUsed} / {currentSubscription.exportsLimit}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                usagePercentage >= 80 ? 'bg-red-500' : 
                usagePercentage >= 60 ? 'bg-yellow-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            ></div>
          </div>
          
          {usagePercentage >= 80 && (
            <p className="text-xs text-amber-600 mt-1">
              ⚠️ You're running low on exports
            </p>
          )}
        </div>
      )}

      {/* Features List */}
      <div className="space-y-1 mb-3">
        <div className="flex items-center text-xs">
          <span className="text-emerald-500 mr-2">✓</span>
          <span className="text-gray-600">Export to Excel & CSV</span>
        </div>
        <div className="flex items-center text-xs">
          <span className={`mr-2 ${isProUser ? 'text-emerald-500' : 'text-gray-400'}`}>
            {isProUser ? '✓' : '✗'}
          </span>
          <span className={isProUser ? 'text-gray-600' : 'text-gray-400'}>
            Google Drive integration
          </span>
        </div>
        <div className="flex items-center text-xs">
          <span className={`mr-2 ${isProUser ? 'text-emerald-500' : 'text-gray-400'}`}>
            {isProUser ? '✓' : '✗'}
          </span>
          <span className={isProUser ? 'text-gray-600' : 'text-gray-400'}>
            Unlimited exports
          </span>
        </div>
        <div className="flex items-center text-xs">
          <span className={`mr-2 ${isProUser ? 'text-emerald-500' : 'text-gray-400'}`}>
            {isProUser ? '✓' : '✗'}
          </span>
          <span className={isProUser ? 'text-gray-600' : 'text-gray-400'}>
            Custom file naming
          </span>
        </div>
      </div>

      {/* Upgrade Button for Free Users */}
      {!isProUser && (
        <button
          onClick={onUpgradeClick}
          className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-medium py-2 px-4 rounded-md hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105"
        >
          🚀 Upgrade to Pro
        </button>
      )}

      {/* Pro User Status */}
      {isProUser && currentSubscription.validUntil && (
        <div className="text-xs text-purple-600 text-center">
          Valid until {new Date(currentSubscription.validUntil).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

export default SubscriptionStatus; 