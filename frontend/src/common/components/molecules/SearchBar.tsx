import React, { useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '../atoms/Input';
import { Icon } from '../atoms/Icon';
import { cn } from '../../utils/classNames';

export interface SearchBarProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'size'
> {
  /** Current search value */
  value?: string;

  /** Callback when search value changes */
  onValueChange?: (value: string) => void;

  /** Callback when clear button is clicked */
  onClear?: () => void;

  /** Loading state */
  loading?: boolean;

  /** Enable keyboard shortcut (Cmd+K / Ctrl+K) */
  enableShortcut?: boolean;

  /** Size of the search bar */
  size?: 'sm' | 'md' | 'lg';

  /** Additional CSS classes */
  className?: string;
}

/**
 * SearchBar Component
 *
 * A search input with icon, clear button, loading state, and keyboard shortcut support.
 *
 * @example
 * // Basic search bar
 * <SearchBar
 *   value={searchQuery}
 *   onValueChange={setSearchQuery}
 *   placeholder="Search products..."
 * />
 *
 * @example
 * // With loading state
 * <SearchBar
 *   value={searchQuery}
 *   onValueChange={setSearchQuery}
 *   loading={isSearching}
 * />
 *
 * @example
 * // With keyboard shortcut
 * <SearchBar
 *   value={searchQuery}
 *   onValueChange={setSearchQuery}
 *   enableShortcut
 * />
 */
export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      value = '',
      onValueChange,
      onClear,
      loading = false,
      enableShortcut = false,
      size = 'md',
      className,
      placeholder = 'Search...',
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);

    // Keyboard shortcut handler
    useEffect(() => {
      if (!enableShortcut) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        // Cmd+K on Mac, Ctrl+K on Windows/Linux
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          inputRef.current?.focus();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [enableShortcut]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onValueChange?.(e.target.value);
      props.onChange?.(e);
    };

    const handleClear = () => {
      onValueChange?.('');
      onClear?.();
      inputRef.current?.focus();
    };

    const showClearButton = value.length > 0 && !loading;

    return (
      <div className={cn('relative', className)}>
        <Input
          ref={(node) => {
            // Handle both refs
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
            // @ts-ignore
            inputRef.current = node;
          }}
          type="search"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          size={size}
          leftIcon={<Icon icon={Search} size="sm" />}
          rightIcon={
            loading ? (
              <Icon icon={Loader2} size="sm" className="animate-spin" />
            ) : showClearButton ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-text-tertiary hover:text-text-secondary transition-colors"
                aria-label="Clear search"
              >
                <Icon icon={X} size="sm" />
              </button>
            ) : undefined
          }
          {...props}
        />

        {enableShortcut && !value && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-text-tertiary bg-surface-base border border-border rounded">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        )}
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';
