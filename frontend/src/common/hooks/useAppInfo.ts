/**
 * useAppInfo Hook
 * 
 * Provides application metadata including version, build info, and branding.
 * Sources data from:
 * 1. /api/capabilities endpoint (primary)
 * 2. Vite build-time environment variables (fallback)
 * 3. ConfigProvider branding context (company info)
 */

import { useQuery } from '@tanstack/react-query';
import { useConfig } from '../../config/ConfigProvider';

interface Capabilities {
  version: string;
  build_hash: string;
  accounting_mode: string;
  features: {
    export: boolean;
    sync: boolean;
  };
}

interface AppInfo {
  version: string;
  buildHash: string;
  buildDate: string;
  companyName: string;
  copyright: string;
  isLoading: boolean;
}

/**
 * Fetch capabilities from backend API
 */
async function fetchCapabilities(): Promise<Capabilities> {
  const response = await fetch('/api/capabilities');
  if (!response.ok) {
    throw new Error('Failed to fetch capabilities');
  }
  return response.json();
}

/**
 * Hook to get application info from API and config
 */
export function useAppInfo(): AppInfo {
  const { branding } = useConfig();
  
  const { data: capabilities, isLoading } = useQuery({
    queryKey: ['capabilities'],
    queryFn: fetchCapabilities,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });

  const currentYear = new Date().getFullYear();
  const companyName = branding?.company?.name ?? 'EasySale';

  return {
    version: capabilities?.version 
      ?? import.meta.env.VITE_APP_VERSION 
      ?? '0.1.0',
    buildHash: (capabilities?.build_hash ?? import.meta.env.VITE_BUILD_HASH ?? 'dev').slice(0, 8),
    buildDate: import.meta.env.VITE_BUILD_DATE ?? new Date().toISOString().split('T')[0],
    companyName,
    copyright: `© ${currentYear} ${companyName}. All rights reserved.`,
    isLoading,
  };
}

export type { AppInfo, Capabilities };
