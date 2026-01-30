import { HTMLAttributes, ReactNode } from 'react';

export interface FormLayoutProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  columns?: 1 | 2 | 3;
}

const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
};

export function FormLayout({ children, columns = 2, className = '', ...props }: FormLayoutProps) {
  return (
    <div className={`grid ${columnClasses[columns]} gap-4 sm:gap-6 ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export interface FormSectionProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  children: ReactNode;
}

export function FormSection({
  title,
  description,
  children,
  className = '',
  ...props
}: FormSectionProps) {
  return (
    <div className={`col-span-full ${className}`.trim()} {...props}>
      <div className="mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-secondary-900">{title}</h3>
        {description && <p className="mt-1 text-sm text-secondary-600">{description}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">{children}</div>
    </div>
  );
}
