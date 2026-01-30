/**
 * @deprecated QUARANTINED - 2026-01-26
 * 
 * This router has been quarantined as part of the navigation consolidation.
 * Settings pages are now accessed via /admin/* routes.
 * 
 * OLD ROUTES → NEW ROUTES:
 * - /settings → /admin
 * - /settings/preferences → /preferences
 * - /settings/integrations → /admin/integrations
 * - /settings/data → /admin/data
 * - /settings/hardware → /admin/hardware
 * - /settings/network → /admin/network
 * - /settings/performance → /admin/performance
 * - /settings/features → /admin/advanced
 * - /settings/localization → /admin/branding
 * - /settings/products → /admin/pricing
 * - /settings/tax → /admin/taxes
 * - /settings/stores → /admin/store
 * - /settings/sync → /admin/health
 * 
 * REPLACEMENT: Routes are now defined directly in App.tsx under the /admin/* path
 * with AdminLayout providing sub-navigation.
 * 
 * DO NOT IMPORT THIS FILE - it exists only for historical reference.
 * All imports have been removed to prevent build errors.
 */

import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * @deprecated Use /admin/* routes instead
 * 
 * This router is a stub that redirects to the new admin routes.
 * The actual route definitions are now in App.tsx.
 */
export function SettingsRouter() {
  console.warn(
    'SettingsRouter is deprecated. Settings are now accessed via /admin/* routes. ' +
    'See App.tsx for the new route structure.'
  );
  
  // Redirect all /settings/* routes to /admin
  return <Navigate to="/admin" replace />;
}
