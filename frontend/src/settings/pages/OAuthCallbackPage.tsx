/**
 * OAuthCallbackPage - Handles OAuth callback from external providers
 * 
 * This page is opened in a popup window after the user authorizes with
 * an external provider (QuickBooks, Stripe, Clover, etc.).
 * 
 * Flow:
 * 1. Parse URL parameters (platform, success, error, state)
 * 2. Validate state matches what was stored in sessionStorage
 * 3. Store result in sessionStorage for parent window
 * 4. Close popup window
 * 
 * Validates: Requirements 11.3, 11.4, 11.5
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { validateOAuthState, storeOAuthResult } from '@common/utils/oauthPopup';

type CallbackStatus = 'validating' | 'success' | 'error' | 'invalid_state';

export const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>('validating');
  const [message, setMessage] = useState<string>('');
  const [platform, setPlatform] = useState<string>('');

  useEffect(() => {
    const platformParam = searchParams.get('platform') || '';
    const successParam = searchParams.get('success');
    const errorParam = searchParams.get('error');
    const stateParam = searchParams.get('state') || '';

    setPlatform(platformParam);

    // Validate state parameter
    if (!stateParam || !validateOAuthState(platformParam, stateParam)) {
      setStatus('invalid_state');
      setMessage('Security validation failed. Please try again.');
      
      // Store error result for parent window
      storeOAuthResult(platformParam, {
        success: false,
        platform: platformParam,
        error: 'Invalid state parameter - possible CSRF attack',
      });
      
      // Close popup after delay
      setTimeout(() => {
        window.close();
      }, 3000);
      return;
    }

    // Process result
    const success = successParam === 'true';
    
    if (success) {
      setStatus('success');
      setMessage(`Successfully connected to ${formatPlatformName(platformParam)}`);
      
      storeOAuthResult(platformParam, {
        success: true,
        platform: platformParam,
        message: 'Authorization successful',
      });
    } else {
      setStatus('error');
      setMessage(errorParam || 'Authorization failed. Please try again.');
      
      storeOAuthResult(platformParam, {
        success: false,
        platform: platformParam,
        error: errorParam || 'Authorization failed',
      });
    }

    // Close popup after showing result
    setTimeout(() => {
      window.close();
    }, 2000);
  }, [searchParams]);

  const formatPlatformName = (p: string): string => {
    const names: Record<string, string> = {
      quickbooks: 'QuickBooks',
      stripe: 'Stripe',
      clover: 'Clover',
      woocommerce: 'WooCommerce',
      square: 'Square',
    };
    return names[p.toLowerCase()] || p;
  };

  const renderIcon = () => {
    switch (status) {
      case 'validating':
        return <Loader2 className="w-16 h-16 text-primary-400 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-16 h-16 text-success-400" />;
      case 'error':
        return <XCircle className="w-16 h-16 text-error-400" />;
      case 'invalid_state':
        return <AlertTriangle className="w-16 h-16 text-warning-400" />;
    }
  };

  const renderTitle = () => {
    switch (status) {
      case 'validating':
        return 'Validating...';
      case 'success':
        return 'Connected!';
      case 'error':
        return 'Connection Failed';
      case 'invalid_state':
        return 'Security Error';
    }
  };

  return (
    <div className="min-h-screen bg-background-primary flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          {renderIcon()}
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text-primary">
            {renderTitle()}
          </h1>
          {platform && (
            <p className="text-text-secondary">
              {formatPlatformName(platform)}
            </p>
          )}
        </div>
        
        <p className="text-text-tertiary">
          {message || 'Processing authorization...'}
        </p>
        
        {status !== 'validating' && (
          <p className="text-sm text-text-disabled">
            This window will close automatically...
          </p>
        )}
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
