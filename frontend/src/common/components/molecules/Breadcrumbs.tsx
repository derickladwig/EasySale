import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, showHome = true }) => {
  const allItems = showHome
    ? [{ label: 'Home', href: '/', icon: <Home className="w-4 h-4" /> }, ...items]
    : items;

  return (
    <nav className="flex items-center space-x-2 text-sm">
      {allItems.map((item, index) => {
        const isLast = index === allItems.length - 1;

        return (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight className="w-4 h-4 text-text-disabled" />}

            {item.href && !isLast ? (
              <Link
                to={item.href}
                className="flex items-center gap-1.5 text-text-tertiary hover:text-text-secondary transition-colors"
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ) : (
              <span
                className={`flex items-center gap-1.5 ${
                  isLast ? 'text-text-primary font-medium' : 'text-text-tertiary'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
