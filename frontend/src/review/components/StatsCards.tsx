import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { DocumentStats } from '../../documents/utils/statsAggregation';

interface StatsCardsProps {
  stats: DocumentStats;
  isLoading?: boolean;
  onCardClick?: (filter: 'NeedsReview' | 'Processing' | 'Failed') => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats, isLoading, onCardClick }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-surface-elevated rounded-lg p-4 h-24" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Needs Review',
      value: stats.needsReview,
      icon: AlertCircle,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      hoverColor: 'hover:bg-yellow-400/20',
      filter: 'NeedsReview' as const,
    },
    {
      label: 'Processing',
      value: stats.processing,
      icon: Clock,
      color: 'text-info',
      bgColor: 'bg-info/10',
      hoverColor: 'hover:bg-info/20',
      filter: 'Processing' as const,
    },
    {
      label: 'Failed',
      value: stats.failed,
      icon: AlertCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-400/10',
      hoverColor: 'hover:bg-red-400/20',
      filter: 'Failed' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const isClickable = onCardClick && card.value > 0;
        
        return (
          <button
            key={card.label}
            onClick={() => isClickable && onCardClick(card.filter)}
            disabled={!isClickable}
            className={`
              ${card.bgColor} 
              rounded-lg p-4 
              transition-all duration-200
              ${isClickable ? `${card.hoverColor} cursor-pointer` : 'cursor-default'}
              disabled:opacity-50
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-text-secondary mb-1">{card.label}</p>
                <p className={`text-3xl font-bold ${card.color}`}>
                  {card.value}
                </p>
              </div>
              <Icon className={`${card.color} w-8 h-8`} />
            </div>
          </button>
        );
      })}
    </div>
  );
};
