/**
 * WebSocket hook for configuration change notifications
 * Establishes WebSocket connection to receive real-time configuration updates
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { devLog } from '../common/utils/devLog';

// WebSocket message types matching backend
interface ConfigChangedMessage {
  ConfigChanged: {
    tenant_id: string;
    change_type: string;
  };
}

type WsMessage = ConfigChangedMessage | 'Ping' | 'Pong';

export interface ConfigWebSocketOptions {
  /** Tenant ID for filtering notifications */
  tenantId: string;
  /** WebSocket endpoint URL (default: ws://localhost:7945/ws) */
  wsUrl?: string;
  /** Callback when configuration changes */
  onConfigChange?: (changeType: string) => void;
  /** Callback when connection status changes */
  onStatusChange?: (status: ConnectionStatus) => void;
  /** Enable automatic reconnection (default: true) */
  autoReconnect?: boolean;
  /** Maximum reconnection attempts (default: 5) */
  maxReconnectAttempts?: number;
  /** Initial reconnection delay in ms (default: 1000) */
  reconnectDelay?: number;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface ConfigWebSocketState {
  /** Current connection status */
  status: ConnectionStatus;
  /** Last error message */
  error: string | null;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
  /** Whether currently attempting to reconnect */
  isReconnecting: boolean;
}

/**
 * Hook for managing WebSocket connection for configuration change notifications
 * 
 * @example
 * ```tsx
 * const { status, error } = useConfigWebSocket({
 *   tenantId: 'my-tenant',
 *   onConfigChange: (changeType) => {
 *     console.log('Config changed:', changeType);
 *     reloadConfig();
 *   },
 * });
 * ```
 */
export function useConfigWebSocket(options: ConfigWebSocketOptions): ConfigWebSocketState {
  const {
    tenantId,
    wsUrl,
    onConfigChange,
    onStatusChange,
    autoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectDelay: initialReconnectDelay = 1000,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(initialReconnectDelay);

  // Update status and notify callback
  const updateStatus = useCallback((newStatus: ConnectionStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  // Calculate WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    if (wsUrl) {
      return `${wsUrl}?tenant_id=${encodeURIComponent(tenantId)}`;
    }

    // Determine WebSocket protocol based on current page protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // Use same host as current page, but with WebSocket protocol
    return `${protocol}//${host}/ws?tenant_id=${encodeURIComponent(tenantId)}`;
  }, [wsUrl, tenantId]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      updateStatus('connecting');
      setError(null);

      const url = getWebSocketUrl();
      devLog.info(`[ConfigWebSocket] Connecting to ${url}`);

      const ws = new WebSocket(url);
      wsRef.current = ws;

      // Connection opened
      ws.onopen = () => {
        devLog.info('[ConfigWebSocket] Connected');
        updateStatus('connected');
        setReconnectAttempts(0);
        setIsReconnecting(false);
        reconnectDelayRef.current = initialReconnectDelay; // Reset delay
      };

      // Message received
      ws.onmessage = (event) => {
        try {
          const message: WsMessage = JSON.parse(event.data);
          
          // Handle different message types
          if (typeof message === 'object' && 'ConfigChanged' in message) {
            const { tenant_id, change_type } = message.ConfigChanged;
            
            devLog.info(
              `[ConfigWebSocket] Configuration changed for tenant ${tenant_id}: ${change_type}`
            );
            
            // Only process if it's for our tenant
            if (tenant_id === tenantId) {
              onConfigChange?.(change_type);
            }
          } else if (message === 'Ping') {
            // Respond to ping with pong
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify('Pong'));
            }
          }
        } catch (err) {
          devLog.warn('[ConfigWebSocket] Failed to parse message:', err);
        }
      };

      // Connection closed
      ws.onclose = (event) => {
        devLog.info(`[ConfigWebSocket] Disconnected (code: ${event.code})`);
        updateStatus('disconnected');
        wsRef.current = null;

        // Attempt reconnection if enabled and not at max attempts
        if (autoReconnect && reconnectAttempts < maxReconnectAttempts) {
          setIsReconnecting(true);
          const delay = reconnectDelayRef.current;
          
          devLog.info(
            `[ConfigWebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1);
            reconnectDelayRef.current = Math.min(delay * 2, 30000); // Exponential backoff, max 30s
            connect();
          }, delay);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          setIsReconnecting(false);
          setError(`Failed to reconnect after ${maxReconnectAttempts} attempts`);
          updateStatus('error');
        }
      };

      // Connection error
      ws.onerror = (event) => {
        devLog.error('[ConfigWebSocket] Error:', event);
        setError('WebSocket connection error');
        updateStatus('error');
      };
    } catch (err) {
      devLog.error('[ConfigWebSocket] Failed to create WebSocket:', err);
      setError(err instanceof Error ? err.message : 'Failed to create WebSocket');
      updateStatus('error');
    }
  }, [
    tenantId,
    getWebSocketUrl,
    updateStatus,
    onConfigChange,
    autoReconnect,
    maxReconnectAttempts,
    reconnectAttempts,
    initialReconnectDelay,
  ]);

  // Connect on mount and when tenantId changes
  useEffect(() => {
    if (!tenantId) {
      devLog.warn('[ConfigWebSocket] No tenant ID provided, skipping connection');
      return;
    }

    connect();

    // Cleanup on unmount
    return () => {
      devLog.info('[ConfigWebSocket] Cleaning up');
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [tenantId, connect]);

  return {
    status,
    error,
    reconnectAttempts,
    isReconnecting,
  };
}
