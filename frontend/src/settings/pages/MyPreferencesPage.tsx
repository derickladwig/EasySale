import React, { useState, useEffect } from 'react';
import { useAuth } from '@common/contexts/AuthContext';
import { Button } from '@common/components/atoms/Button';
import { Input } from '@common/components/atoms/Input';
import { Toggle } from '@common/components/atoms/Toggle';
import { CollapsibleSection } from '@common/components/molecules/CollapsibleSection';
import { Tabs, TabItem } from '@common/components/organisms/Tabs';
import { useToast } from '@common/contexts/ToastContext';
import { useDisplaySettings } from '@common/hooks/useDisplaySettings';
import { User, Lock, Palette, Bell, Save } from 'lucide-react';

export const MyPreferencesPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const { settings: displaySettings, updateSettings: updateDisplaySettings } = useDisplaySettings();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Profile state
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [email, setEmail] = useState(user?.email || '');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Appearance state - sync with displaySettings
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>(displaySettings.theme);

  // Sync theme state with displaySettings when it changes
  useEffect(() => {
    setTheme(displaySettings.theme);
  }, [displaySettings.theme]);

  // Notifications state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [desktopNotifications, setDesktopNotifications] = useState(false);

  const tabs: TabItem[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName, email })
      });
      if (!response.ok) throw new Error('Failed to update profile');
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      // Password change endpoint - graceful handling if not available
      const response = await fetch('/api/users/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
      });
      if (response.status === 404) {
        toast.warning('Password change feature is not yet available');
        return;
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to change password');
      }
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change password';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAppearance = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme })
      });
      if (!response.ok) throw new Error('Failed to save appearance preferences');
      toast.success('Appearance preferences saved');
    } catch {
      toast.error('Failed to save appearance preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email_notifications: emailNotifications,
          desktop_notifications: desktopNotifications 
        })
      });
      if (!response.ok) throw new Error('Failed to save notification preferences');
      toast.success('Notification preferences saved');
    } catch {
      toast.error('Failed to save notification preferences');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background-primary">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-light">
        <h1 className="text-3xl font-bold text-text-primary">My Preferences</h1>
        <p className="text-text-secondary mt-2">
          Manage your personal profile, password, and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-light">
        <div className="px-6">
          <Tabs items={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <CollapsibleSection title="Personal Information" icon={User} defaultOpen={true}>
                <div className="space-y-4">
                  <Input
                    label="Display Name"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Enter your display name"
                  />

                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Enter your email"
                    helperText="This email will be used for notifications and account recovery"
                  />
                </div>
              </CollapsibleSection>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <CollapsibleSection title="Change Password" icon={Lock} defaultOpen={true}>
                <div className="space-y-4">
                  <Input
                    label="Current Password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Enter your current password"
                  />

                  <Input
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Enter your new password"
                    helperText="Password must be at least 8 characters"
                  />

                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Confirm your new password"
                  />
                </div>
              </CollapsibleSection>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <CollapsibleSection title="Theme Settings" icon={Palette} defaultOpen={true}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Theme
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      {(['light', 'dark', 'auto'] as const).map((themeOption) => (
                        <button
                          key={themeOption}
                          onClick={() => {
                            setTheme(themeOption);
                            // Apply theme immediately for instant feedback
                            updateDisplaySettings({ theme: themeOption });
                            setHasUnsavedChanges(true);
                          }}
                          className={`
                            p-4 rounded-lg border-2 transition-all duration-200
                            ${
                              theme === themeOption
                                ? 'border-primary-500 bg-primary-500/10'
                                : 'border-border-light bg-background-secondary hover:border-border-DEFAULT'
                            }
                          `}
                        >
                          <div className="text-center">
                            <div className="text-sm font-medium text-text-primary capitalize">
                              {themeOption}
                            </div>
                            <div className="text-xs text-text-tertiary mt-1">
                              {themeOption === 'light' && 'Always light'}
                              {themeOption === 'dark' && 'Always dark'}
                              {themeOption === 'auto' && 'System default'}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <CollapsibleSection
                title="Notification Preferences"
                icon={Bell}
                defaultOpen={true}
              >
                <div className="space-y-4">
                  <div className="p-4 bg-background-secondary rounded-lg">
                    <Toggle
                      checked={emailNotifications}
                      onChange={(checked) => {
                        setEmailNotifications(checked);
                        setHasUnsavedChanges(true);
                      }}
                      label="Email Notifications"
                      description="Receive notifications via email"
                    />
                  </div>

                  <div className="p-4 bg-background-secondary rounded-lg">
                    <Toggle
                      checked={desktopNotifications}
                      onChange={(checked) => {
                        setDesktopNotifications(checked);
                        setHasUnsavedChanges(true);
                      }}
                      label="Desktop Notifications"
                      description="Show desktop notifications for important events"
                    />
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Footer with Save/Cancel */}
      <div className="border-t border-border-light bg-background-secondary px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            {hasUnsavedChanges && (
              <span className="text-sm text-warning-DEFAULT flex items-center gap-2">
                <span className="w-2 h-2 bg-warning-DEFAULT rounded-full animate-pulse"></span>
                You have unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                // Reset to original values
                setDisplayName(user?.display_name || '');
                setEmail(user?.email || '');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                // Reset theme to saved value from displaySettings
                setTheme(displaySettings.theme);
                setEmailNotifications(true);
                setDesktopNotifications(false);
                setHasUnsavedChanges(false);
                toast.info('Changes discarded');
              }}
              variant="ghost"
              disabled={!hasUnsavedChanges}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setIsLoading(true);
                try {
                  // Save based on active tab
                  if (activeTab === 'profile') {
                    await handleSaveProfile();
                  } else if (activeTab === 'security') {
                    await handleChangePassword();
                  } else if (activeTab === 'appearance') {
                    await handleSaveAppearance();
                  } else if (activeTab === 'notifications') {
                    await handleSaveNotifications();
                  }
                  setHasUnsavedChanges(false);
                } catch {
                  // Error already handled in individual handlers
                } finally {
                  setIsLoading(false);
                }
              }}
              variant="primary"
              loading={isLoading}
              disabled={!hasUnsavedChanges}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
