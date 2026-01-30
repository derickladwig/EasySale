import { useEffect } from 'react';
import { useConfig } from '../../config/ConfigProvider';
import { initializeFavicon } from '../../utils/favicon';

/**
 * Hook to manage dynamic favicon updates based on configuration
 */
export function useFavicon() {
  const { config } = useConfig();

  useEffect(() => {
    if (config) {
      initializeFavicon(config);
    }
  }, [config]);
}
