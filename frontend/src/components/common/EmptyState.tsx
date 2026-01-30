/**
 * EmptyState Component
 * 
 * Simple empty state component for displaying when no data is available
 * Requirements: 16.2, 16.4
 */

import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-text-tertiary mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-text-tertiary mb-6 max-w-md">{description}</p>
      <button
        onClick={action.onClick}
        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        {action.label}
      </button>
    </div>
  );
};
