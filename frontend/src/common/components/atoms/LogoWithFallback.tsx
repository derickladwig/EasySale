/**
 * LogoWithFallback Component
 * 
 * Displays a logo image with automatic text fallback if the image fails to load.
 * Validates: Requirements 6.1 (Branding and White-Label Configuration)
 * 
 * Fallback priority:
 * 1. Image URL (if provided and loads successfully)
 * 2. Company icon (if provided)
 * 3. Company shortName (if provided)
 * 4. First 2 letters of company name (uppercase)
 */

import { useState } from 'react';
import { cn } from '../../utils/classNames';

export interface LogoWithFallbackProps {
  /** URL of the logo image */
  logoUrl?: string | null;
  /** Company name for alt text and fallback */
  companyName: string;
  /** Short name for fallback (optional) */
  shortName?: string;
  /** Icon character/emoji for fallback (optional) */
  icon?: string;
  /** CSS class for the container */
  className?: string;
  /** CSS class for the image */
  imgClassName?: string;
  /** CSS class for the text fallback */
  textClassName?: string;
  /** Size of the container (used for text fallback sizing) */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Test ID for testing */
  testId?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
};

/**
 * LogoWithFallback Component
 * 
 * Renders a logo image with automatic fallback to text if the image fails to load.
 * The text fallback uses the following priority:
 * 1. icon (if provided)
 * 2. shortName (if provided)
 * 3. First 2 letters of companyName (uppercase)
 */
export function LogoWithFallback({
  logoUrl,
  companyName,
  shortName,
  icon,
  className,
  imgClassName,
  textClassName,
  size = 'md',
  testId = 'logo-with-fallback',
}: LogoWithFallbackProps) {
  const [imageError, setImageError] = useState(false);

  // Generate text fallback
  const textFallback = icon || shortName || companyName.substring(0, 2).toUpperCase();

  // Show text fallback if no logo URL or image failed to load
  const showTextFallback = !logoUrl || imageError;

  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden rounded-lg',
        sizeClasses[size],
        className
      )}
      data-testid={testId}
    >
      {showTextFallback ? (
        <div
          className={cn(
            'w-full h-full bg-primary-600 flex items-center justify-center',
            textClassName
          )}
          data-testid={`${testId}-text-fallback`}
        >
          <span className="text-white font-bold">
            {textFallback}
          </span>
        </div>
      ) : (
        <img
          src={logoUrl}
          alt={`${companyName} logo`}
          className={cn('w-full h-full object-contain', imgClassName)}
          onError={() => setImageError(true)}
          data-testid={`${testId}-image`}
        />
      )}
    </div>
  );
}
