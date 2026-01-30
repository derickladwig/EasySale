/**
 * FirstRunSetupPage
 * 
 * Dedicated page for first-run setup wizard.
 * This page is shown automatically when the system detects no configuration.
 * It wraps SetupWizardPage with first-run mode enabled.
 * 
 * After setup is complete, redirects to the home page.
 * 
 * Validates: Requirements 7.2
 * - IF no tenant is configured, THEN THE System SHALL show a Setup Wizard
 * - Block POS flows until configured
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SetupWizardPage } from '../../admin/pages/SetupWizardPage';
import { useTenantSetup } from '@common/contexts/TenantSetupContext';

export function FirstRunSetupPage() {
  const navigate = useNavigate();
  const { markSetupComplete, isConfigured } = useTenantSetup();

  // If already configured, redirect to home
  if (isConfigured) {
    navigate('/', { replace: true });
    return null;
  }

  const handleComplete = useCallback(() => {
    // Mark setup as complete in context
    markSetupComplete();
    // Navigate to home page
    navigate('/', { replace: true });
  }, [markSetupComplete, navigate]);

  return (
    <SetupWizardPage
      isFirstRun={true}
      onComplete={handleComplete}
      // No onCancel - first-run wizard cannot be cancelled
    />
  );
}
