/**
 * WizardCompletionScreen Component
 * 
 * Displays "Store is ready" message after setup wizard completion.
 * Simplified to just show success and go to Sell.
 * 
 * Validates: Requirements 7.2
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ShoppingCart } from 'lucide-react';
import { Button } from '@common/components/atoms/Button';
import { useConfig } from '../../../config/ConfigProvider';

interface WizardCompletionScreenProps {
  /** Store name to display */
  storeName?: string;
  /** Callback when user clicks "Go to Sell" */
  onGoToSell?: () => void;
  /** Whether this is first-run completion */
  isFirstRun?: boolean;
}

export function WizardCompletionScreen({
  storeName = 'Your Store',
  onGoToSell,
  isFirstRun = false,
}: WizardCompletionScreenProps) {
  const navigate = useNavigate();
  const { brandConfig } = useConfig();
  const appName = brandConfig?.appName || brandConfig?.company?.name || 'Your Store';

  const handleGoToSell = () => {
    if (onGoToSell) {
      onGoToSell();
    }
    navigate('/sell');
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-background-primary p-6">
      <div className="max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success-500/20 mb-4">
            <CheckCircle2 className="w-12 h-12 text-success-400" />
          </div>
        </div>

        {/* Main Message */}
        <h1 className="text-3xl font-bold text-white mb-3">
          {isFirstRun ? `Welcome to ${appName}!` : 'Setup Complete!'}
        </h1>
        <p className="text-xl text-text-secondary mb-2">
          <span className="text-primary-400 font-semibold">{storeName}</span> is ready
        </p>
        <p className="text-text-tertiary mb-8">
          Your store is configured. You can always update settings from Admin → Settings.
        </p>

        {/* Primary CTA */}
        <Button
          variant="primary"
          size="lg"
          onClick={handleGoToSell}
          rightIcon={<ShoppingCart className="w-5 h-5" />}
        >
          Start Selling
        </Button>
      </div>
    </div>
  );
}
