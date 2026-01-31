/**
 * AdminStepContent - Create First Admin Account
 * 
 * Required step for setting up the initial administrator account.
 * Auto-completes if user is already authenticated.
 * Validates: Requirements 7.2, 8.2, 8.3
 */

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@common/components/atoms/Button';
import { cn } from '@common/utils/classNames';
import { useAuth } from '@common/contexts/AuthContext';
import { apiClient } from '@common/utils/apiClient';
import type { StepContentProps, AdminStepData } from './types';
import wizardStyles from '../../pages/SetupWizard.module.css';

export function AdminStepContent({
  onComplete,
  data,
  isComplete,
}: StepContentProps<AdminStepData>) {
  const { user, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState<AdminStepData>({
    username: data?.username || '',
    email: data?.email || '',
    password: '',
    confirmPassword: '',
    displayName: data?.displayName || '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof AdminStepData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-complete if user is already authenticated
  useEffect(() => {
    if (isAuthenticated && user && !isComplete) {
      // User is already logged in, auto-complete this step
      const adminData: AdminStepData = {
        username: user.username,
        email: user.email,
        password: '', // Not needed since account exists
        confirmPassword: '',
        displayName: user.display_name || user.firstName || user.username,
      };
      onComplete(adminData);
    }
  }, [isAuthenticated, user, isComplete, onComplete]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof AdminStepData, string>> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }


    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Call backend API to create admin user
      await apiClient.post('/api/users/first-admin', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        display_name: formData.displayName || formData.username,
        role: 'admin',
      });
      onComplete(formData);
    } catch (error) {
      console.error('Failed to create admin:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create admin account';
      setErrors({ username: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof AdminStepData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };


  if (isComplete) {
    return (
      <div className="bg-success-500/10 border border-success-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-success-400" />
          <div>
            <h3 className="text-lg font-medium text-success-300">
              Admin Account Created
            </h3>
            <p className="text-success-400/80 text-sm mt-1">
              Administrator account for {data?.email} has been set up.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Password validation rules
  const passwordRules = [
    { label: '8+ characters', met: formData.password.length >= 8 },
    { label: 'Uppercase', met: /[A-Z]/.test(formData.password) },
    { label: 'Lowercase', met: /[a-z]/.test(formData.password) },
    { label: 'Number', met: /\d/.test(formData.password) },
  ];

  return (
    <form onSubmit={handleSubmit}>
      {/* Identity Section */}
      <div className={wizardStyles.formSection}>
        <h3 className={wizardStyles.formSectionTitle}>Identity</h3>

        {/* Display Name (optional) */}
        <div className={wizardStyles.formGroup}>
          <label className={wizardStyles.formLabel}>
            Display Name <span style={{ opacity: 0.5 }}>(optional)</span>
          </label>
          <input
            type="text"
            value={formData.displayName}
            onChange={handleChange('displayName')}
            placeholder="John Smith"
            className={wizardStyles.formInput}
          />
        </div>

        {/* Username */}
        <div className={wizardStyles.formGroup}>
          <label className={cn(wizardStyles.formLabel, wizardStyles.formLabelRequired)}>
            Username
          </label>
          <input
            type="text"
            value={formData.username}
            onChange={handleChange('username')}
            placeholder="admin"
            className={cn(
              wizardStyles.formInput,
              errors.username && wizardStyles.formInputError
            )}
          />
          {errors.username && (
            <p className={wizardStyles.formError}>{errors.username}</p>
          )}
        </div>

        {/* Email */}
        <div className={wizardStyles.formGroup}>
          <label className={cn(wizardStyles.formLabel, wizardStyles.formLabelRequired)}>
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={handleChange('email')}
            placeholder="admin@yourstore.com"
            className={cn(
              wizardStyles.formInput,
              errors.email && wizardStyles.formInputError
            )}
          />
          {errors.email && (
            <p className={wizardStyles.formError}>{errors.email}</p>
          )}
        </div>
      </div>

      {/* Security Section */}
      <div className={wizardStyles.formSection}>
        <h3 className={wizardStyles.formSectionTitle}>Security</h3>

        {/* Password */}
        <div className={wizardStyles.formGroup}>
          <label className={cn(wizardStyles.formLabel, wizardStyles.formLabelRequired)}>
            Password
          </label>
          <div className={wizardStyles.passwordWrapper}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange('password')}
              placeholder="••••••••"
              className={cn(
                wizardStyles.formInput,
                errors.password && wizardStyles.formInputError
              )}
              style={{ paddingRight: '70px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={wizardStyles.passwordToggle}
            >
              {showPassword ? (
                <>
                  <EyeOff className={wizardStyles.passwordToggleIcon} />
                  Hide
                </>
              ) : (
                <>
                  <Eye className={wizardStyles.passwordToggleIcon} />
                  Show
                </>
              )}
            </button>
          </div>
          {errors.password && (
            <p className={wizardStyles.formError}>{errors.password}</p>
          )}
          {/* Password rules inline */}
          <div className={wizardStyles.passwordRules}>
            {passwordRules.map((rule) => (
              <span
                key={rule.label}
                className={cn(
                  wizardStyles.passwordRule,
                  rule.met && wizardStyles.passwordRuleMet
                )}
              >
                {rule.met ? (
                  <CheckCircle2 className={wizardStyles.passwordRuleIcon} />
                ) : (
                  <span className={wizardStyles.passwordRuleIcon} style={{ width: 12, height: 12, borderRadius: '50%', border: '1px solid currentColor', display: 'inline-block' }} />
                )}
                {rule.label}
              </span>
            ))}
          </div>
        </div>

        {/* Confirm Password */}
        <div className={wizardStyles.formGroup}>
          <label className={cn(wizardStyles.formLabel, wizardStyles.formLabelRequired)}>
            Confirm Password
          </label>
          <div className={wizardStyles.passwordWrapper}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              placeholder="••••••••"
              className={cn(
                wizardStyles.formInput,
                errors.confirmPassword && wizardStyles.formInputError
              )}
              style={{ paddingRight: '70px' }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className={wizardStyles.passwordToggle}
            >
              {showConfirmPassword ? (
                <>
                  <EyeOff className={wizardStyles.passwordToggleIcon} />
                  Hide
                </>
              ) : (
                <>
                  <Eye className={wizardStyles.passwordToggleIcon} />
                  Show
                </>
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className={wizardStyles.formError}>{errors.confirmPassword}</p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        loading={isSubmitting}
        className="w-full"
      >
        Create Admin Account
      </Button>
    </form>
  );
}
