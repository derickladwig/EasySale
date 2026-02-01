/**
 * Tests for useConfigWebSocket hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useConfigWebSocket } from '../useConfigWebSocket';

// Mock WebSocket
class MockWebSocket {
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readyState: number = WebSocket.CONNECTING;

  constructor(public url: string) {
    // Simulate connection opening after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string) {
    // Mock send
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: 1000 }));
    }
  }
}

describe('useConfigWebSocket', () => {
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    // Save original WebSocket
    originalWebSocket = global.WebSocket;
    // Replace with mock
    global.WebSocket = MockWebSocket as any;
  });

  afterEach(() => {
    // Restore original WebSocket
    global.WebSocket = originalWebSocket;
  });

  it('should connect to WebSocket with tenant ID', async () => {
    const { result } = renderHook(() =>
      useConfigWebSocket({
        tenantId: 'test-tenant',
      })
    );

    // Initially connecting
    expect(result.current.status).toBe('connecting');

    // Wait for connection
    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });

    expect(result.current.error).toBeNull();
  });

  it('should call onConfigChange when configuration changes', async () => {
    const onConfigChange = vi.fn();
    const onStatusChange = vi.fn();

    const { result } = renderHook(() =>
      useConfigWebSocket({
        tenantId: 'test-tenant',
        onConfigChange,
        onStatusChange,
      })
    );

    // Wait for connection
    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });

    // Simulate receiving a config change message
    const ws = (global.WebSocket as any).mock.instances[0];
    if (ws && ws.onmessage) {
      ws.onmessage(
        new MessageEvent('message', {
          data: JSON.stringify({
            ConfigChanged: {
              tenant_id: 'test-tenant',
              change_type: 'modified',
            },
          }),
        })
      );
    }

    // Verify callback was called
    await waitFor(() => {
      expect(onConfigChange).toHaveBeenCalledWith('modified');
    });
  });

  it('should not call onConfigChange for different tenant', async () => {
    const onConfigChange = vi.fn();

    const { result } = renderHook(() =>
      useConfigWebSocket({
        tenantId: 'test-tenant',
        onConfigChange,
      })
    );

    // Wait for connection
    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });

    // Simulate receiving a config change message for different tenant
    const ws = (global.WebSocket as any).mock.instances[0];
    if (ws && ws.onmessage) {
      ws.onmessage(
        new MessageEvent('message', {
          data: JSON.stringify({
            ConfigChanged: {
              tenant_id: 'other-tenant',
              change_type: 'modified',
            },
          }),
        })
      );
    }

    // Verify callback was NOT called
    expect(onConfigChange).not.toHaveBeenCalled();
  });

  it('should handle connection errors', async () => {
    // Mock WebSocket that fails immediately
    class FailingWebSocket extends MockWebSocket {
      constructor(url: string) {
        super(url);
        setTimeout(() => {
          if (this.onerror) {
            this.onerror(new Event('error'));
          }
        }, 10);
      }
    }

    global.WebSocket = FailingWebSocket as any;

    const { result } = renderHook(() =>
      useConfigWebSocket({
        tenantId: 'test-tenant',
        autoReconnect: false,
      })
    );

    // Wait for error
    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.error).toBeTruthy();
  });

  it('should skip connection when tenant ID is empty', () => {
    const { result } = renderHook(() =>
      useConfigWebSocket({
        tenantId: '',
      })
    );

    // Should remain disconnected
    expect(result.current.status).toBe('disconnected');
  });

  it('should respond to ping messages with pong', async () => {
    const { result } = renderHook(() =>
      useConfigWebSocket({
        tenantId: 'test-tenant',
      })
    );

    // Wait for connection
    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });

    // Get the WebSocket instance
    const ws = (global.WebSocket as any).mock.instances[0];
    const sendSpy = vi.spyOn(ws, 'send');

    // Simulate receiving a ping message
    if (ws && ws.onmessage) {
      ws.onmessage(
        new MessageEvent('message', {
          data: JSON.stringify('Ping'),
        })
      );
    }

    // Verify pong was sent
    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify('Pong'));
    });
  });
});
