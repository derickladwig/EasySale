import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { toast } from '@common/components/molecules/Toast';
import { ConfirmDialog } from '@common/components/molecules/ConfirmDialog';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Edit2, 
  Clock, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Play,
  Pause,
  Globe,
  AlertTriangle
} from 'lucide-react';
import { syncApi, SyncSchedule } from '../../services/syncApi';

interface ScheduleFormData {
  entity: string;
  cronExpression: string;
  mode: 'full' | 'incremental';
  enabled: boolean;
  timezone?: string;
  concurrencyPolicy?: 'queue' | 'skip';
}

// Extended schedule type with additional fields
interface ExtendedSyncSchedule extends SyncSchedule {
  timezone?: string;
  concurrencyPolicy?: 'queue' | 'skip';
  isRunning?: boolean;
}

const ENTITY_OPTIONS = [
  { value: 'products', label: 'Products' },
  { value: 'customers', label: 'Customers' },
  { value: 'orders', label: 'Orders' },
  { value: 'inventory', label: 'Inventory' },
];

const CRON_PRESETS = [
  { value: '0 * * * *', label: 'Every hour' },
  { value: '0 */2 * * *', label: 'Every 2 hours' },
  { value: '0 */6 * * *', label: 'Every 6 hours' },
  { value: '0 0 * * *', label: 'Daily at midnight' },
  { value: '0 6 * * *', label: 'Daily at 6 AM' },
  { value: '0 0 * * 0', label: 'Weekly (Sunday midnight)' },
];

// Common timezone options
// Validates: Requirements 7.2, 13.1
const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
];

// Concurrency policy options
// Validates: Requirements 13.2
const CONCURRENCY_OPTIONS = [
  { value: 'queue', label: 'Queue - Wait for previous to complete' },
  { value: 'skip', label: 'Skip - Skip if previous still running' },
];

export const SyncScheduleManager: React.FC = () => {
  const [schedules, setSchedules] = useState<ExtendedSyncSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ExtendedSyncSchedule | null>(null);
  const [formData, setFormData] = useState<ScheduleFormData>({
    entity: 'products',
    cronExpression: '0 * * * *',
    mode: 'incremental',
    enabled: true,
    timezone: 'UTC',
    concurrencyPolicy: 'queue',
  });
  const [saving, setSaving] = useState(false);
  
  // Delete confirmation dialog state
  // Validates: Requirements 7.5
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSchedules = useCallback(async () => {
    try {
      const data = await syncApi.getSchedules();
      setSchedules(data);
    } catch (error) {
      console.error('Failed to load schedules:', error);
      toast.error('Failed to load sync schedules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingSchedule) {
        await syncApi.updateSchedule(editingSchedule.id, formData);
        toast.success('Schedule updated successfully');
      } else {
        await syncApi.createSchedule(formData);
        toast.success('Schedule created successfully');
      }
      setShowForm(false);
      setEditingSchedule(null);
      resetForm();
      loadSchedules();
    } catch (error) {
      console.error('Failed to save schedule:', error);
      toast.error('Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (schedule: ExtendedSyncSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      entity: schedule.entity,
      cronExpression: schedule.cronExpression,
      mode: schedule.mode,
      enabled: schedule.enabled,
      timezone: schedule.timezone || 'UTC',
      concurrencyPolicy: schedule.concurrencyPolicy || 'queue',
    });
    setShowForm(true);
  };

  // Open delete confirmation dialog
  // Validates: Requirements 7.5
  const handleDeleteClick = (id: number) => {
    setScheduleToDelete(id);
    setDeleteConfirmOpen(true);
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (scheduleToDelete === null) return;
    
    setDeleting(true);
    try {
      await syncApi.deleteSchedule(scheduleToDelete);
      toast.success('Schedule deleted');
      loadSchedules();
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      toast.error('Failed to delete schedule');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setScheduleToDelete(null);
    }
  };

  const handleToggleEnabled = async (schedule: ExtendedSyncSchedule) => {
    try {
      await syncApi.updateSchedule(schedule.id, { enabled: !schedule.enabled });
      toast.success(`Schedule ${schedule.enabled ? 'disabled' : 'enabled'}`);
      loadSchedules();
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
      toast.error('Failed to update schedule');
    }
  };

  const resetForm = () => {
    setFormData({
      entity: 'products',
      cronExpression: '0 * * * *',
      mode: 'incremental',
      enabled: true,
      timezone: 'UTC',
      concurrencyPolicy: 'queue',
    });
  };

  // Format next run time in selected timezone
  // Validates: Requirements 13.4
  const formatNextRun = (nextRun?: string, timezone?: string) => {
    if (!nextRun) return 'Not scheduled';
    const date = new Date(nextRun);
    try {
      return date.toLocaleString('en-US', {
        timeZone: timezone || 'UTC',
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return date.toLocaleString();
    }
  };

  // Calculate countdown to next execution
  // Validates: Requirements 13.5
  const getCountdown = (nextRun?: string): string | null => {
    if (!nextRun) return null;
    const now = new Date();
    const next = new Date(nextRun);
    const diff = next.getTime() - now.getTime();
    
    if (diff <= 0) return 'Running soon...';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    }
    return `in ${minutes}m`;
  };

  const getCronDescription = (cron: string) => {
    const preset = CRON_PRESETS.find(p => p.value === cron);
    return preset?.label || cron;
  };

  if (loading) {
    return (
      <Card>
        <div className="p-6 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-primary-400 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-primary-400" />
            <h2 className="text-xl font-semibold text-text-primary">Sync Schedules</h2>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setEditingSchedule(null);
              setShowForm(true);
            }}
            variant="primary"
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Schedule
          </Button>
        </div>

        {/* Schedule Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-surface-base rounded-lg space-y-4">
            <h3 className="text-lg font-medium text-text-primary">
              {editingSchedule ? 'Edit Schedule' : 'New Schedule'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Entity
                </label>
                <select
                  value={formData.entity}
                  onChange={(e) => setFormData({ ...formData, entity: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {ENTITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Sync Mode
                </label>
                <select
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value as 'full' | 'incremental' })}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="incremental">Incremental</option>
                  <option value="full">Full</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Schedule (Cron)
                </label>
                <select
                  value={formData.cronExpression}
                  onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {CRON_PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Timezone Selector */}
              {/* Validates: Requirements 7.2, 13.1 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {TIMEZONE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Concurrency Policy Selector */}
              {/* Validates: Requirements 13.2 */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Concurrency Policy
                </label>
                <select
                  value={formData.concurrencyPolicy}
                  onChange={(e) => setFormData({ ...formData, concurrencyPolicy: e.target.value as 'queue' | 'skip' })}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {CONCURRENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                    className="w-4 h-4 rounded border-border bg-surface-elevated text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-text-secondary">Enabled</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setEditingSchedule(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={saving}
              >
                {saving ? 'Saving...' : editingSchedule ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        )}

        {/* Schedules List */}
        {schedules.length === 0 ? (
          <div className="text-center py-8 text-text-tertiary">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No sync schedules configured</p>
            <p className="text-sm mt-1">Create a schedule to automate data synchronization</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => {
              const countdown = getCountdown(schedule.nextRun);
              return (
                <div
                  key={schedule.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    schedule.isRunning
                      ? 'bg-primary-500/10 border-primary-500/30'
                      : schedule.enabled
                      ? 'bg-surface-base border-border'
                      : 'bg-surface-base/50 border-border/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      schedule.isRunning
                        ? 'bg-primary-500/30'
                        : schedule.enabled 
                        ? 'bg-primary-500/20' 
                        : 'bg-surface-elevated'
                    }`}>
                      {schedule.isRunning ? (
                        <RefreshCw className="w-5 h-5 text-primary-400 animate-spin" />
                      ) : (
                        <Clock className={`w-5 h-5 ${schedule.enabled ? 'text-primary-400' : 'text-text-disabled'}`} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-text-primary capitalize">{schedule.entity}</span>
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          schedule.mode === 'full' 
                            ? 'bg-warning-500/20 text-warning-400' 
                            : 'bg-primary-500/20 text-primary-400'
                        }`}>
                          {schedule.mode}
                        </span>
                        {schedule.isRunning ? (
                          <span className="px-2 py-0.5 text-xs rounded bg-primary-500/20 text-primary-400 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            In Progress
                          </span>
                        ) : schedule.enabled ? (
                          <CheckCircle className="w-4 h-4 text-success-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-text-disabled" />
                        )}
                      </div>
                      <div className="text-sm text-text-tertiary mt-1 flex items-center gap-2">
                        {getCronDescription(schedule.cronExpression)}
                        {schedule.timezone && schedule.timezone !== 'UTC' && (
                          <span className="flex items-center gap-1 text-xs text-text-disabled">
                            <Globe className="w-3 h-3" />
                            {schedule.timezone}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-text-disabled mt-1 flex items-center gap-3 flex-wrap">
                        <span>
                          Next: {formatNextRun(schedule.nextRun, schedule.timezone)}
                          {countdown && !schedule.isRunning && (
                            <span className="ml-1 text-primary-400">({countdown})</span>
                          )}
                        </span>
                        {schedule.lastRun && (
                          <span>
                            Last: {new Date(schedule.lastRun).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleEnabled(schedule)}
                      title={schedule.enabled ? 'Disable' : 'Enable'}
                      disabled={schedule.isRunning}
                    >
                      {schedule.enabled ? (
                        <Pause className="w-4 h-4 text-warning-400" />
                      ) : (
                        <Play className="w-4 h-4 text-success-400" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(schedule)}
                      title="Edit"
                      disabled={schedule.isRunning}
                    >
                      <Edit2 className="w-4 h-4 text-text-tertiary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(schedule.id)}
                      title="Delete"
                      disabled={schedule.isRunning}
                    >
                      <Trash2 className="w-4 h-4 text-error-400" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {/* Validates: Requirements 7.5 */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setScheduleToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Schedule"
        message="Are you sure you want to delete this schedule? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleting}
      />
    </Card>
  );
};
