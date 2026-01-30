import { ReactNode } from 'react';
import { useBreakpoint } from '../hooks/useBreakpoint';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
  const { isMobile } = useBreakpoint();

  return (
    <div className="bg-white border-b border-border">
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6">
        {/* Breadcrumbs - Hidden on mobile */}
        {breadcrumbs && breadcrumbs.length > 0 && !isMobile && (
          <nav className="mb-2 flex items-center space-x-2 text-sm text-secondary-600">
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="flex items-center">
                {index > 0 && <span className="mx-2">/</span>}
                {crumb.href ? (
                  <a href={crumb.href} className="hover:text-primary-600">
                    {crumb.label}
                  </a>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Title and Actions */}
        <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'items-center justify-between'}`}>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-secondary-900 truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm sm:text-base text-secondary-600 line-clamp-2">
                {subtitle}
              </p>
            )}
          </div>

          {/* Actions */}
          {actions && (
            <div className={`flex-shrink-0 ${isMobile ? 'w-full' : 'ml-4'}`}>{actions}</div>
          )}
        </div>
      </div>
    </div>
  );
}
