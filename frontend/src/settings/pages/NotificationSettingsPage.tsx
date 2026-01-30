import React, { useState } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { Input } from '@common/components/atoms/Input';
import { toast } from '@common/components/molecules/Toast';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Webhook, 
  Plus, 
  Trash2, 
  TestTube, 
  History,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react';
import { EmptyState } from '@common/components/molecules/EmptyState';
import { LoadingSpinner } from '@common/components/organisms/LoadingSpinner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { syncApi } from '../../services/syncApi';

// Types
interface NotificationConfig {
  id: string;
  tenant_id: string;
  notification_type: 'email' | 'slack' | 'webhook';
  enabled: boolean;
  config: EmailConfig | SlackConfig | WebhookConfig;
  filters: NotificationFilters;
}

interface EmailConfig {
  type: 'Email';
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  from_address: string;
  to_addresses: string[];
}

interface SlackConfig {
  type: 'Slack';
  webhook_url: string;
  channel?: string;
  username?: string;
}

interface WebhookConfig {
  type: 'Webhook';
  url: string;
  method: string;
  headers: Record<string, string>;
  auth_token?: string;
}

interface NotificationFilters {
  min_severity: 'info' | 'warning' | 'error' | 'critical';
  connectors?: string[];
  entity_types?: string[];
  error_types?: string[];
}

interface NotificationHistory {
  id: string;
  event_type: string;
  severity: string;
  title: string;
  message: string;
  sent_at: string;
  success: boolean;
  error_message?: string;
}

// Hooks
const useNotificationConfigs = () => {
  return useQuery({
    queryKey: ['notification-configs'],
    queryFn: async () => {
      const response = await syncApi.getNotificationConfigs();
      return response as NotificationConfig[];
    },
  });
};

const useNotificationHistory = () => {
  return useQuery({
    queryKey: ['notification-history'],
    queryFn: async () => {
      const response = await syncApi.getNotificationHistory();
      return response as NotificationHistory[];
    },
  });
};

const useCreateNotificationConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: Partial<NotificationConfig>) => {
      return syncApi.createNotificationConfig(config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-configs'] });
      toast.success('Notification channel created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create channel: ${error.message}`);
    },
  });
};

const useDeleteNotificationConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return syncApi.deleteNotificationConfig(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-configs'] });
      toast.success('Notification channel deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete channel: ${error.message}`);
    },
  });
};

const useTestNotification = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      return syncApi.testNotificationConfig(id);
    },
    onSuccess: () => {
      toast.success('Test notification sent');
    },
    onError: (error: Error) => {
      toast.error(`Test failed: ${error.message}`);
    },
  });
};

// Components
const ChannelIcon: React.FC<{ type: string; className?: string }> = ({ type, className }) => {
  switch (type) {
    case 'email':
      return <Mail className={className} />;
    case 'slack':
      return <MessageSquare className={className} />;
    case 'webhook':
      return <Webhook className={className} />;
    default:
      return <Bell className={className} />;
  }
};

const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const colors: Record<string, string> = {
    info: 'bg-info-500/20 text-info-400',
    warning: 'bg-warning-500/20 text-warning-400',
    error: 'bg-error-500/20 text-error-400',
    critical: 'bg-error-600/30 text-error-300',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[severity] || colors.info}`}>
      {severity}
    </span>
  );
};

interface AddChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: Partial<NotificationConfig>) => void;
}

const AddChannelModal: React.FC<AddChannelModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [channelType, setChannelType] = useState<'email' | 'slack' | 'webhook'>('email');
  const [formData, setFormData] = useState({
    // Email
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    from_address: '',
    to_addresses: '',
    // Slack
    webhook_url: '',
    channel: '',
    username: '',
    // Webhook
    url: '',
    method: 'POST',
    auth_token: '',
    // Filters
    min_severity: 'warning' as const,
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let config: EmailConfig | SlackConfig | WebhookConfig;
    
    if (channelType === 'email') {
      config = {
        type: 'Email',
        smtp_host: formData.smtp_host,
        smtp_port: formData.smtp_port,
        smtp_username: formData.smtp_username,
        smtp_password: formData.smtp_password,
        from_address: formData.from_address,
        to_addresses: formData.to_addresses.split(',').map(e => e.trim()),
      };
    } else if (channelType === 'slack') {
      config = {
        type: 'Slack',
        webhook_url: formData.webhook_url,
        channel: formData.channel || undefined,
        username: formData.username || undefined,
      };
    } else {
      config = {
        type: 'Webhook',
        url: formData.url,
        method: formData.method,
        headers: {},
        auth_token: formData.auth_token || undefined,
      };
    }

    onSubmit({
      notification_type: channelType,
      enabled: true,
      config,
      filters: {
        min_severity: formData.min_severity,
      },
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-secondary rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Add Notification Channel</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Channel Type Selection */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Channel Type</label>
            <div className="flex gap-2">
              {(['email', 'slack', 'webhook'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setChannelType(type)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    channelType === type
                      ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                      : 'border-border-default bg-surface-primary text-text-secondary hover:border-border-hover'
                  }`}
                >
                  <ChannelIcon type={type} className="w-4 h-4" />
                  <span className="capitalize">{type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Email Configuration */}
          {channelType === 'email' && (
            <>
              <Input
                label="SMTP Host"
                value={formData.smtp_host}
                onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                placeholder="smtp.example.com"
                required
              />
              <Input
                label="SMTP Port"
                type="number"
                value={formData.smtp_port.toString()}
                onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 587 })}
                required
              />
              <Input
                label="Username"
                value={formData.smtp_username}
                onChange={(e) => setFormData({ ...formData, smtp_username: e.target.value })}
                required
              />
              <Input
                label="Password"
                type="password"
                value={formData.smtp_password}
                onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
                required
              />
              <Input
                label="From Address"
                type="email"
                value={formData.from_address}
                onChange={(e) => setFormData({ ...formData, from_address: e.target.value })}
                placeholder="alerts@example.com"
                required
              />
              <Input
                label="To Addresses (comma-separated)"
                value={formData.to_addresses}
                onChange={(e) => setFormData({ ...formData, to_addresses: e.target.value })}
                placeholder="admin@example.com, manager@example.com"
                required
              />
            </>
          )}

          {/* Slack Configuration */}
          {channelType === 'slack' && (
            <>
              <Input
                label="Webhook URL"
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                placeholder="https://hooks.slack.com/services/..."
                required
              />
              <Input
                label="Channel (optional)"
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                placeholder="#alerts"
              />
              <Input
                label="Bot Username (optional)"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="EasySale Bot"
              />
            </>
          )}

          {/* Webhook Configuration */}
          {channelType === 'webhook' && (
            <>
              <Input
                label="Webhook URL"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://api.example.com/webhook"
                required
              />
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">HTTP Method</label>
                <select
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border-default bg-surface-primary text-text-primary"
                >
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              <Input
                label="Auth Token (optional)"
                type="password"
                value={formData.auth_token}
                onChange={(e) => setFormData({ ...formData, auth_token: e.target.value })}
                placeholder="Bearer token for authorization"
              />
            </>
          )}

          {/* Severity Filter */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Minimum Severity</label>
            <select
              value={formData.min_severity}
              onChange={(e) => setFormData({ ...formData, min_severity: e.target.value as 'info' | 'warning' | 'error' | 'critical' })}
              className="w-full px-3 py-2 rounded-lg border border-border-default bg-surface-primary text-text-primary"
            >
              <option value="info">Info (all notifications)</option>
              <option value="warning">Warning and above</option>
              <option value="error">Error and above</option>
              <option value="critical">Critical only</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Add Channel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Page Component
export const NotificationSettingsPage: React.FC = () => {
  const { data: configs = [], isLoading: configsLoading } = useNotificationConfigs();
  const { data: history = [], isLoading: historyLoading } = useNotificationHistory();
  const createConfig = useCreateNotificationConfig();
  const deleteConfig = useDeleteNotificationConfig();
  const testNotification = useTestNotification();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const handleAddChannel = (config: Partial<NotificationConfig>) => {
    createConfig.mutate(config);
  };

  const handleDeleteChannel = (id: string) => {
    if (confirm('Are you sure you want to delete this notification channel?')) {
      deleteConfig.mutate(id);
    }
  };

  const handleTestChannel = (id: string) => {
    testNotification.mutate(id);
  };

  if (configsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Notification Settings</h1>
          <p className="text-text-secondary mt-2">
            Configure how you receive alerts for sync errors, rate limits, and connection failures
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            {showHistory ? 'Hide History' : 'View History'}
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Channel
          </Button>
        </div>
      </div>

      {/* Notification Channels */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Notification Channels
        </h2>

        {configs.length === 0 ? (
          <EmptyState
            title="No notification channels configured"
            description="Add email, Slack, or webhook channels to receive alerts when sync issues occur"
            icon={<Bell size={48} />}
            action={
              <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Channel
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {configs.map((config) => (
              <div
                key={config.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border-default bg-surface-primary"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${config.enabled ? 'bg-success-500/20' : 'bg-surface-tertiary'}`}>
                    <ChannelIcon 
                      type={config.notification_type} 
                      className={`w-5 h-5 ${config.enabled ? 'text-success-400' : 'text-text-tertiary'}`} 
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary capitalize">
                        {config.notification_type}
                      </span>
                      <SeverityBadge severity={config.filters.min_severity} />
                      {config.enabled ? (
                        <span className="text-xs text-success-400">Active</span>
                      ) : (
                        <span className="text-xs text-text-tertiary">Disabled</span>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary mt-1">
                      {config.notification_type === 'email' && 
                        `Sending to ${(config.config as EmailConfig).to_addresses.length} recipient(s)`}
                      {config.notification_type === 'slack' && 
                        `Channel: ${(config.config as SlackConfig).channel || 'Default'}`}
                      {config.notification_type === 'webhook' && 
                        `${(config.config as WebhookConfig).method} to ${(config.config as WebhookConfig).url}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleTestChannel(config.id)}
                    disabled={testNotification.isPending}
                    className="flex items-center gap-1"
                  >
                    <TestTube className="w-4 h-4" />
                    Test
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteChannel(config.id)}
                    disabled={deleteConfig.isPending}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Notification History */}
      {showHistory && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            Recent Notifications
          </h2>

          {historyLoading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner />
            </div>
          ) : history.length === 0 ? (
            <EmptyState
              title="No notifications sent yet"
              description="Notification history will appear here once alerts are triggered"
              icon={<History size={48} />}
            />
          ) : (
            <div className="space-y-3">
              {history.slice(0, 20).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 p-3 rounded-lg border border-border-default bg-surface-primary"
                >
                  <div className={`p-1.5 rounded ${item.success ? 'bg-success-500/20' : 'bg-error-500/20'}`}>
                    {item.success ? (
                      <CheckCircle className="w-4 h-4 text-success-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-error-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary truncate">{item.title}</span>
                      <SeverityBadge severity={item.severity} />
                    </div>
                    <p className="text-sm text-text-secondary mt-1 truncate">{item.message}</p>
                    {item.error_message && (
                      <p className="text-sm text-error-400 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {item.error_message}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-text-tertiary whitespace-nowrap">
                    {new Date(item.sent_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Add Channel Modal */}
      <AddChannelModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddChannel}
      />
    </div>
  );
};

export default NotificationSettingsPage;
