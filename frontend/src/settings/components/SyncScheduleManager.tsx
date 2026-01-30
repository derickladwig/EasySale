import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { toast } from '@common/components/molecules/Toast';
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
  Pause
} from 'lucide-react';
import { syncApi, SyncSchedule } from '../../services/syncApi';

interface ScheduleFormData {
  entity: string;
  cronExpression: string;
  mode: 'full' | 'incremental';
  enabled: boolean;
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

export const SyncScheduleManager: React.FC = () => {
  const [schedules, setSchedules] = useState<SyncSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<SyncSchedule | null>(null);
  const [formData, setFormData] = useState<ScheduleFormData>({
    entity: 'products',
    cronExpression: '0 * * * *',
    mode: 'incremental',
    enabled: true,
  });
  const [saving, setSaving] = useState(false);

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

  const handleEdit = (schedule: SyncSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      entity: schedule.entity,
      cronExpression: schedule.cronExpression,
      mode: schedule.mode,
      enabled: schedule.enabled,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      await syncApi.deleteSchedule(id);
      toast.success('Schedule deleted');
      loadSchedules();
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      toast.error('Failed to delete schedule');
    }
  };

  const handleToggleEnabled = async (schedule: SyncSchedule) => {
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
    });
  };

  const formatNextRun = (nextRun?: string) => {
    if (!nextRun) return 'Not scheduled';
    const date = new Date(nextRun);
    return date.toLocaleString();
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
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  schedule.enabled
                    ? 'bg-surface-base border-border'
                    : 'bg-surface-base/50 border-border/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${schedule.enabled ? 'bg-primary-500/20' : 'bg-surface-elevated'}`}>
                    <Clock className={`w-5 h-5 ${schedule.enabled ? 'text-primary-400' : 'text-text-disabled'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary capitalize">{schedule.entity}</span>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        schedule.mode === 'full' 
                          ? 'bg-warning-500/20 text-warning-400' 
                          : 'bg-primary-500/20 text-primary-400'
                      }`}>
                        {schedule.mode}
                      </span>
                      {schedule.enabled ? (
                        <CheckCircle className="w-4 h-4 text-success-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-text-disabled" />
                      )}
                    </div>
                    <div className="text-sm text-text-tertiary mt-1">
                      {getCronDescription(schedule.cronExpression)}
                    </div>
                    <div className="text-xs text-text-disabled mt-1">
                      Next run: {formatNextRun(schedule.nextRun)}
                      {schedule.lastRun && (
                        <span className="ml-3">
                          Last run: {new Date(schedule.lastRun).toLocaleString()}
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
                  >
                    <Edit2 className="w-4 h-4 text-text-tertiary" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(schedule.id)}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-error-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
