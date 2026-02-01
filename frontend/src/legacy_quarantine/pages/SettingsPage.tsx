/**
 * @deprecated QUARANTINED - 2026-01-26
 * 
 * This page has been quarantined as part of the navigation consolidation.
 * The unified settings landing page is no longer used - settings are now
 * organized under Admin sub-routes with AdminLayout providing navigation.
 * 
 * OLD ROUTE: /settings (landing page with 9 logical groups)
 * NEW ROUTE: /admin (AdminPage with sub-navigation tabs)
 * 
 * REPLACEMENT: AdminPage at /admin with AdminLayout sub-navigation
 * - Individual settings pages are accessed via /admin/* routes
 * - User preferences are accessed via /preferences
 * 
 * DO NOT IMPORT THIS FILE - it exists only for historical reference.
 * All imports have been removed to prevent build errors.
 */

import React from 'react';

/**
 * @deprecated Use AdminPage at /admin instead
 * 
 * This component is a stub that exists only for historical reference.
 * The actual implementation has been moved to:
 * - AdminPage (/admin) - main admin dashboard
 * - MyPreferencesPage (/preferences) - user preferences
 * - Various /admin/* sub-routes for specific settings
 */
export const SettingsPage: React.FC = () => {
  console.warn(
    'SettingsPage is deprecated. Settings are now organized under /admin/* routes. ' +
    'See AdminPage and AdminLayout for the new structure.'
  );

  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold text-error-500 mb-4">
        ⚠️ Deprecated Component
      </h1>
      <p className="text-text-secondary mb-4">
        This settings page has been deprecated and quarantined.
      </p>
      <p className="text-text-secondary">
        Please use <code className="bg-surface-elevated px-2 py-1 rounded">/admin</code> instead.
      </p>
    </div>
  );
};
