import React from 'react';
import { SubscriptionStatus } from '../../SubscriptionStatus';

interface SubscriptionTabProps {
  onUpgradeClick: () => void;
}

export const SubscriptionTab: React.FC<SubscriptionTabProps> = ({ onUpgradeClick }) => {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription</h2>
      <SubscriptionStatus onUpgradeClick={onUpgradeClick} />
    </div>
  );
}; 