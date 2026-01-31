/**
 * SyncNowDropdown Component
 * 
 * Dropdown menu for sync actions with Full Resync option for admins.
 * 
 * Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5
 */

import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, ChevronDown, AlertTriangle } from 'lucide-react';
import { Button } from '@common/components/atoms/Button';
import { cn } from '@common/utils/classNames';

export interface SyncNowDropdownProps {
  /** Integration ID */
  integrationId: string;
  /** Integration name for display */
  integrationName: string;
  /** Whether a sync is currently running */
  isSyncing: boolean;
  /** Whether the user has admin role for full resync */
  canFullResync: boolean;
  /** Callback for incremental sync */
  onIncrementalSync: () => Promise<void>;
  /** Callback for full resync (requires confirmation) */
  onFullResync: () => void;
  /** Callback for dry run */
  onDryRun?: () => Promise<void>;
  /** Additional CSS classes */
  className?: string;
}

/**
 * SyncNowDropdown renders a button with dropdown for sync options.
 * 
 * - Default action: Incremental sync
 * - Admin-only: Full Resync (opens confirmation dialog)
 * - Optional: Dry Run
 * 
 * Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5
 */
export function SyncNowDropdown({
  integrationId,
  integrationName,
  isSyncing,
  canFullResync,
  onIncrementalSync,
  onFullResync,
  onDryRun,
  className,
}: SyncNowDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleIncrementalSync = async () => {
    setIsOpen(false);
    await onIncrementalSync();
  };

  const handleFullResync = () => {
    setIsOpen(false);
    onFullResync();
  };

  const handleDryRun = async () => {
    setIsOpen(false);
    if (onDryRun) {
      await onDryRun();
    }
  };

  // If no dropdown options (no admin, no dry run), just show simple button
  const showDropdown = canFullResync || onDryRun;

  if (!showDropdown) {
    return (
      <Button
        onClick={handleIncrementalSync}
        variant="primary"
        size="sm"
        disabled={isSyncing}
        className={cn('flex items-center gap-2', className)}
      >
        <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
        {isSyncing ? 'Syncing...' : 'Sync Now'}
      </Button>
    );
  }

  return (
    <div ref={menuRef} className={cn('relative inline-block', className)}>
      {/* Split button: main action + dropdown trigger */}
      <div className="flex">
        {/* Main sync button */}
        <Button
          onClick={handleIncrementalSync}
          variant="primary"
          size="sm"
          disabled={isSyncing}
          className="rounded-r-none flex items-center gap-2"
        >
          <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </Button>
        
        {/* Dropdown trigger */}
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="primary"
          size="sm"
          disabled={isSyncing}
          className="rounded-l-none border-l border-primary-700 px-2"
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label="More sync options"
        >
          <ChevronDown 
            className={cn(
              'w-4 h-4 transition-transform duration-200',
              isOpen && 'rotate-180'
            )} 
          />
        </Button>
      </div>

      {/* Dropdown menu - uses dropdown z-index token */}
      {isOpen && (
        <div 
          className={cn(
            'absolute right-0 top-full mt-1 w-48 py-1',
            'bg-surface-elevated border border-border rounded-xl',
            'animate-in fade-in slide-in-from-top-2 duration-200'
          )}
          style={{ 
            zIndex: 'var(--z-dropdown)',
            boxShadow: 'var(--shadow-dropdown)'
          }}
          role="menu"
        >
          {/* Incremental Sync */}
          <button
            onClick={handleIncrementalSync}
            disabled={isSyncing}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
              'text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            role="menuitem"
          >
            <RefreshCw className="w-4 h-4" />
            <div>
              <div className="font-medium text-sm">Incremental Sync</div>
              <div className="text-xs text-text-tertiary">Sync recent changes only</div>
            </div>
          </button>

          {/* Dry Run (if available) */}
          {onDryRun && (
            <button
              onClick={handleDryRun}
              disabled={isSyncing}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                'text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              role="menuitem"
            >
              <RefreshCw className="w-4 h-4" />
              <div>
                <div className="font-medium text-sm">Dry Run</div>
                <div className="text-xs text-text-tertiary">Preview without changes</div>
              </div>
            </button>
          )}

          {/* Full Resync (admin only) */}
          {canFullResync && (
            <>
              <div className="border-t border-border my-1" />
              <button
                onClick={handleFullResync}
                disabled={isSyncing}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  'text-warning-400 hover:bg-warning-500/10',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                role="menuitem"
              >
                <AlertTriangle className="w-4 h-4" />
                <div>
                  <div className="font-medium text-sm">Full Resync</div>
                  <div className="text-xs text-text-tertiary">Resync all data (slow)</div>
                </div>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default SyncNowDropdown;
