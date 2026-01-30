import React, { useState } from 'react';
import { ChevronDown, ChevronRight, LucideIcon } from 'lucide-react';

export interface CollapsibleSectionProps {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * CollapsibleSection component for organizing content in expandable sections
 *
 * Features:
 * - Expandable/collapsible content
 * - Optional icon
 * - Smooth animation
 * - Keyboard accessible
 * - Default open/closed state
 */
export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className={`border border-border-light rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="w-full flex items-center justify-between px-6 py-4 bg-background-secondary hover:bg-background-tertiary transition-colors duration-200"
        aria-expanded={isOpen}
        aria-controls={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-primary-400" />}
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        </div>
        <div className="text-text-secondary transition-transform duration-200">
          {isOpen ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </div>
      </button>

      {/* Content */}
      <div
        id={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}
        className={`
          transition-all duration-300 ease-in-out overflow-hidden
          ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="px-6 py-4 bg-background-primary border-t border-border-light">
          {children}
        </div>
      </div>
    </div>
  );
};
