# Tauri Desktop App Setup Guide for EasySale

## Overview

This guide provides step-by-step instructions to add Tauri v2 desktop app support to EasySale, enabling native Windows/macOS/Linux builds alongside the existing Docker deployment.

## Why Tauri?

- **Small size**: ~15-20MB installers vs ~100MB Docker images
- **Fast startup**: 1-2 seconds vs 10-30 seconds for Docker
- **Native feel**: True desktop app with system integration
- **Offline-first**: No Docker required, fully portable
- **Auto-updates**: Built-in update mechanism
- **LAN support**: Can connect to local or remote backend

## Prerequisites

- Node.js 20+ (already installed)
- Rust 1.75+ (already installed for backend)
- Windows: Visual Studio Build Tools or MSVC
- macOS: Xcode Command Line Tools
- Linux: webkit2gtk, libssl-dev, libgtk-3-dev

## Step 1: Install Tauri Dependencies

```bash
cd frontend

# Install Tauri CLI and API
npm install -D @tauri-apps/cli@^2.0.0
npm install @tauri-apps/api@^2.0.0

# Install Tauri plugins
npm install @tauri-apps/plugin-shell@^2.0.0
npm install @tauri-apps/plugin-fs@^2.0.0
npm install @tauri-apps/plugin-http@^2.0.0
npm install @tauri-apps/plugin-dialog@^2.0.0
npm install @tauri-apps/plugin-notification@^2.0.0
```

## Step 2: Create Tauri Project Structure

```bash
cd frontend

# Initialize Tauri (will create src-tauri/ directory)
npx tauri init

# When prompted:
# - App name: EasySale
# - Window title: EasySale
# - Web assets location: ../dist
# - Dev server URL: http://localhost:7945
# - Frontend dev command: npm run dev
# - Frontend build command: npm run build
```

## Step 3: Configure Tauri

Create `frontend/src-tauri/tauri.conf.json`:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "EasySale",
  "version": "0.1.0",
  "identifier": "com.easysale.app",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:7945",
    "frontendDist": "../dist"
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "title": "EasySale",
        "width": 1280,
        "height": 800,
        "minWidth": 1024,
        "minHeight": 768,
        "resizable": true,
        "fullscreen": false,
        "decorations": true,
        "alwaysOnTop": false,
        "skipTaskbar": false,
        "center": true
      }
    ],
    "security": {
      "csp": {
        "default-src": "'self'",
        "script-src": "'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src": "'self' 'unsafe-inline'",
        "img-src": "'self' data: https: blob:",
        "font-src": "'self' data:",
        "connect-src": [
          "'self'",
          "http://localhost:8923",
          "ws://localhost:8923",
          "http://127.0.0.1:8923",
          "ws://127.0.0.1:8923",
          "http://192.168.*:8923",
          "ws://192.168.*:8923",
          "http://10.*:8923",
          "ws://10.*:8923"
        ]
      },
      "dangerousDisableAssetCspModification": false,
      "freezePrototype": true
    }
  },
  "bundle": {
    "active": true,
    "targets": ["msi", "nsis"],
    "icon": [
      "icons/icon.png",
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": "",
      "wix": {
        "language": "en-US"
      },
      "nsis": {
        "installerIcon": "icons/icon.ico",
        "installMode": "perUser",
        "languages": ["en-US"],
        "displayLanguageSelector": false
      }
    },
    "macOS": {
      "minimumSystemVersion": "10.13"
    },
    "linux": {
      "deb": {
        "depends": []
      }
    }
  },
  "plugins": {
    "shell": {
      "open": true,
      "scope": [
        {
          "name": "open-browser",
          "cmd": "open",
          "args": true
        }
      ]
    },
    "fs": {
      "scope": [
        "$APPDATA/*",
        "$APPDATA/**",
        "$LOCALDATA/*",
        "$LOCALDATA/**",
        "$RESOURCE/*",
        "$RESOURCE/**"
      ]
    },
    "http": {
      "scope": [
        "http://localhost:8923/*",
        "http://127.0.0.1:8923/*",
        "http://192.168.*:8923/*",
        "http://10.*:8923/*"
      ]
    },
    "dialog": {
      "all": true
    },
    "notification": {
      "all": true
    }
  }
}
```

## Step 4: Create Rust Backend for Tauri

Create `frontend/src-tauri/src/main.rs`:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, State};
use std::sync::Mutex;

// Application state
struct AppState {
    backend_url: Mutex<String>,
}

// Tauri commands
#[tauri::command]
fn get_backend_url(state: State<AppState>) -> String {
    state.backend_url.lock().unwrap().clone()
}

#[tauri::command]
fn set_backend_url(url: String, state: State<AppState>) -> Result<(), String> {
    let mut backend_url = state.backend_url.lock().unwrap();
    *backend_url = url;
    Ok(())
}

#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
async fn check_backend_health(url: String) -> Result<bool, String> {
    let health_url = format!("{}/health", url);
    
    match reqwest::get(&health_url).await {
        Ok(response) => Ok(response.status().is_success()),
        Err(e) => Err(format!("Health check failed: {}", e)),
    }
}

fn main() {
    // Load backend URL from environment or use default
    let backend_url = std::env::var("BACKEND_URL")
        .unwrap_or_else(|_| "http://localhost:8923".to_string());

    tauri::Builder::default()
        .manage(AppState {
            backend_url: Mutex::new(backend_url),
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            get_backend_url,
            set_backend_url,
            get_app_version,
            check_backend_health
        ])
        .setup(|app| {
            // Log startup
            println!("EasySale desktop app starting...");
            
            // You can add startup logic here
            // e.g., check for updates, validate backend connection
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Update `frontend/src-tauri/Cargo.toml`:

```toml
[package]
name = "easysale"
version = "0.1.0"
description = "EasySale - White-Label Multi-Tenant POS System"
authors = ["EasySale Team"]
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = ["protocol-asset"] }
tauri-plugin-shell = "2"
tauri-plugin-fs = "2"
tauri-plugin-http = "2"
tauri-plugin-dialog = "2"
tauri-plugin-notification = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
reqwest = { version = "0.11", features = ["json"] }
tokio = { version = "1", features = ["full"] }
```

## Step 5: Update Frontend API Client

Update `frontend/src/api/apiClient.ts`:

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';
import { invoke } from '@tauri-apps/api/core';

// Check if running in Tauri
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

// Get base URL
async function getBaseURL(): Promise<string> {
  if (isTauri) {
    try {
      // Get backend URL from Tauri state
      return await invoke<string>('get_backend_url');
    } catch (error) {
      console.error('Failed to get backend URL from Tauri:', error);
      return 'http://localhost:8923';
    }
  }
  
  // Docker/web deployment
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Relative URL for production (same origin)
  if (import.meta.env.PROD) {
    return window.location.origin.replace(':7945', ':8923');
  }
  
  // Development fallback
  return 'http://localhost:8923';
}

// Create axios instance
let apiClient: AxiosInstance;

async function initializeApiClient(): Promise<AxiosInstance> {
  if (apiClient) {
    return apiClient;
  }

  const baseURL = await getBaseURL();
  
  apiClient = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  });

  // Add request interceptor for auth token
  apiClient.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Add response interceptor for error handling
  apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (error.response?.status === 401) {
        // Clear auth and redirect to login
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return apiClient;
}

// Export initialized client
export const getApiClient = async (): Promise<AxiosInstance> => {
  return await initializeApiClient();
};

// Export default for backward compatibility
export default apiClient;
```

## Step 6: Add Tauri-Specific Components

Create `frontend/src/tauri/BackendConfig.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

export const BackendConfig: React.FC = () => {
  const [backendUrl, setBackendUrl] = useState('http://localhost:8923');
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    loadBackendUrl();
  }, []);

  const loadBackendUrl = async () => {
    try {
      const url = await invoke<string>('get_backend_url');
      setBackendUrl(url);
      checkHealth(url);
    } catch (error) {
      console.error('Failed to load backend URL:', error);
    }
  };

  const checkHealth = async (url: string) => {
    setIsChecking(true);
    try {
      const healthy = await invoke<boolean>('check_backend_health', { url });
      setIsHealthy(healthy);
    } catch (error) {
      setIsHealthy(false);
    } finally {
      setIsChecking(false);
    }
  };

  const saveBackendUrl = async () => {
    try {
      await invoke('set_backend_url', { url: backendUrl });
      await checkHealth(backendUrl);
      // Reload the app to use new backend
      window.location.reload();
    } catch (error) {
      console.error('Failed to save backend URL:', error);
    }
  };

  return (
    <div className="p-4 bg-surface rounded-lg border border-border">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        Backend Configuration
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Backend URL
          </label>
          <input
            type="text"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary"
            placeholder="http://localhost:8923"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => checkHealth(backendUrl)}
            disabled={isChecking}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg"
          >
            {isChecking ? 'Checking...' : 'Test Connection'}
          </button>

          <button
            onClick={saveBackendUrl}
            className="px-4 py-2 bg-success-500 hover:bg-success-600 text-white rounded-lg"
          >
            Save & Reload
          </button>

          {isHealthy !== null && (
            <span className={`text-sm ${isHealthy ? 'text-success-500' : 'text-error-500'}`}>
              {isHealthy ? '✓ Connected' : '✗ Connection failed'}
            </span>
          )}
        </div>

        <div className="text-sm text-text-secondary">
          <p>Common configurations:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Local: http://localhost:8923</li>
            <li>LAN: http://192.168.1.100:8923</li>
            <li>Remote: https://your-server.com:8923</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
```

## Step 7: Update Package Scripts

Add to `frontend/package.json`:

```json
{
  "scripts": {
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "tauri:build:debug": "tauri build --debug",
    "tauri:icon": "tauri icon"
  }
}
```

## Step 8: Generate Icons

```bash
cd frontend

# Place your icon.png (1024x1024 or larger) in src-tauri/icons/
# Then generate all required icon sizes:
npm run tauri:icon src-tauri/icons/icon.png
```

## Step 9: Build and Test

### Development Mode
```bash
cd frontend

# Start Tauri in development mode (will also start Vite)
npm run tauri:dev
```

### Production Build
```bash
cd frontend

# Build Windows installer
npm run tauri:build

# Output will be in:
# src-tauri/target/release/bundle/msi/EasySale_0.1.0_x64_en-US.msi
# src-tauri/target/release/bundle/nsis/EasySale_0.1.0_x64-setup.exe
```

## Step 10: Backend Setup for Desktop App

The desktop app needs a backend to connect to. You have two options:

### Option A: Embedded Backend (Recommended)
Package the Rust backend with the Tauri app:

1. Copy backend binary to Tauri resources
2. Start backend process from Tauri on app launch
3. Connect to localhost:8923

### Option B: Separate Backend
Run backend separately:

```bash
# Start backend
cd backend
cargo run --release

# Or use Docker
docker-compose -f docker-compose.prod.yml up -d backend
```

Then configure desktop app to connect to backend URL.

## LAN Access Configuration

### For Desktop App to Access LAN Backend

1. **Start backend on server**:
   ```bash
   # On server machine (e.g., 192.168.1.100)
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Configure desktop app**:
   - Open Backend Configuration in app
   - Set URL to: `http://192.168.1.100:8923`
   - Test connection
   - Save & Reload

3. **Firewall rules**:
   - Allow port 8923 on server
   - Ensure devices are on same network

## Troubleshooting

### Build Errors

**Error: "tauri" command not found**
```bash
npm install -D @tauri-apps/cli@^2.0.0
```

**Error: Rust not found**
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**Error: MSVC not found (Windows)**
- Install Visual Studio Build Tools
- Or install Visual Studio Community with C++ workload

### Runtime Errors

**Error: Backend connection failed**
- Check backend is running
- Verify backend URL is correct
- Check firewall settings
- Test with curl: `curl http://localhost:8923/health`

**Error: CSP violation**
- Update `tauri.conf.json` CSP to allow backend URL
- Add to `connect-src` in security.csp

## Comparison: Docker vs Tauri

| Aspect | Docker | Tauri Desktop |
|--------|--------|---------------|
| **Installation** | Docker Desktop required | Single .exe/.msi installer |
| **Size** | ~100MB (images) | ~15-20MB (installer) |
| **Startup** | 10-30 seconds | 1-2 seconds |
| **Memory** | ~500MB (containers) | ~100-150MB |
| **Updates** | Docker pull | Built-in auto-updater |
| **Offline** | Requires Docker running | Fully offline capable |
| **LAN** | ✅ Built-in | ✅ Configurable |
| **Backend** | Bundled in container | Separate or embedded |
| **Platform** | Linux/Windows (WSL) | Windows/macOS/Linux native |

## Recommended Deployment Strategy

1. **Development**: Use Docker for full-stack development
2. **Desktop Users**: Use Tauri app + Docker backend on server
3. **Server Deployment**: Use Docker for production backend
4. **Portable**: Use Tauri with embedded backend

## Next Steps

1. Complete Phase 1 of BUILD_AUDIT (fix colors and types)
2. Test Docker builds thoroughly
3. Implement Tauri setup following this guide
4. Create installers for Windows
5. Test LAN connectivity
6. Document user installation process

---

*Guide version: 1.0*
*Last updated: February 1, 2026*
