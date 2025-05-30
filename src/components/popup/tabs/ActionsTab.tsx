import React from 'react';
import { QuickActions } from '../../QuickActions';

export const ActionsTab: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
      <QuickActions />
    </div>
  );
}; 