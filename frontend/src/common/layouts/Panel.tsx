import { HTMLAttributes, ReactNode } from 'react';

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export function Panel({ children, title, padding = 'md', className = '', ...props }: PanelProps) {
  return (
    <div
      className={`bg-surface border border-border rounded-lg sm:rounded-xl shadow-sm ${className}`.trim()}
      {...props}
    >
      {title && (
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
          <h3 className="text-base sm:text-lg font-semibold text-text-primary">{title}</h3>
        </div>
      )}
      <div className={paddingClasses[padding]}>{children}</div>
    </div>
  );
}
