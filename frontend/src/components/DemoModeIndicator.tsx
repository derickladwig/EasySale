import { AlertTriangle } from 'lucide-react';
import { useConfig } from '../config';

/**
 * DemoModeIndicator component
 * 
 * Displays a prominent banner when the system is running in demo mode.
 * Only visible when RUNTIME_PROFILE=demo.
 * 
 * Requirements: 2.5 - Demo mode UI indicator
 */
export function DemoModeIndicator() {
  const { profile } = useConfig();

  // Only show in demo mode
  if (profile !== 'demo') {
    return null;
  }

  return (
    <div className="bg-warning-500/20 border-b border-warning-500/30 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-warning-400">
        <AlertTriangle size={18} className="flex-shrink-0" />
        <span className="text-sm font-medium">
          Demo Mode Active - Data is for demonstration purposes only
        </span>
      </div>
    </div>
  );
}
