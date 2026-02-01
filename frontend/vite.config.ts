import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

// Content Security Policy and Security Headers plugin
function securityHeadersPlugin(): Plugin {
  return {
    name: 'security-headers-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Content Security Policy
        res.setHeader(
          'Content-Security-Policy',
          [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-inline for Vite HMR, unsafe-eval for validation libs
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https: blob:",
            "font-src 'self' data:",
            "connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*", // Allow API and HMR
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; ')
        );
        
        // Additional security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      securityHeadersPlugin(),
      // Bundle visualizer - generates stats.html for analysis
      visualizer({
        filename: 'dist/stats.html',
        open: false, // Don't auto-open in CI
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // treemap, sunburst, or network
      }),
    ],
    
    // Path aliases matching tsconfig.json
    resolve: {
      alias: {
        '@common': path.resolve(__dirname, './src/common'),
        '@features': path.resolve(__dirname, './src/features'),
        '@domains': path.resolve(__dirname, './src/domains'),
        '@assets': path.resolve(__dirname, './src/assets'),
        '@stores': path.resolve(__dirname, './src/stores'),
      },
    },

    // Environment variables
    // Only define VITE_API_URL if explicitly set - otherwise let apiClient.ts use relative URLs in production
    // Also inject build-time variables for version, build hash, and build date
    // Build variant support for split builds (lite, export, full)
    define: {
      ...(env.VITE_API_URL
        ? { 'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL) }
        : {}),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '0.1.0'),
      'import.meta.env.VITE_BUILD_HASH': JSON.stringify(process.env.BUILD_HASH || 'dev'),
      'import.meta.env.VITE_BUILD_DATE': JSON.stringify(new Date().toISOString().split('T')[0]),
      // Build variant (lite, export, full) - defaults to 'export' to match documentation
      'import.meta.env.VITE_BUILD_VARIANT': JSON.stringify(env.VITE_BUILD_VARIANT || 'export'),
    },

    // Development server configuration
    server: {
      port: parseInt(env.VITE_PORT || '7945'),
      host: true,
      strictPort: false,
    },

    // Build configuration
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      // Asset optimization
      assetsInlineLimit: 4096, // Inline assets < 4KB as base64
      chunkSizeWarningLimit: 500, // Warn if chunk > 500KB
      rollupOptions: {
        output: {
          // Deliberate code splitting strategy for optimal caching and loading
          manualChunks: (id) => {
            // React core - rarely changes, cache long-term
            if (id.includes('node_modules/react-dom') || 
                id.includes('node_modules/react/') ||
                id.includes('node_modules/scheduler')) {
              return 'react-vendor';
            }
            
            // React Router - separate from React core
            if (id.includes('node_modules/react-router')) {
              return 'router-vendor';
            }
            
            // TanStack Query - data fetching layer
            if (id.includes('node_modules/@tanstack/react-query')) {
              return 'query-vendor';
            }
            
            // UI icons - lucide-react
            if (id.includes('node_modules/lucide-react')) {
              return 'ui-vendor';
            }
            
            // Date utilities
            if (id.includes('node_modules/date-fns')) {
              return 'dates-vendor';
            }
            
            // Validation
            if (id.includes('node_modules/zod')) {
              return 'validation-vendor';
            }
            
            // Class utilities
            if (id.includes('node_modules/clsx') || 
                id.includes('node_modules/tailwind-merge')) {
              return 'utils-vendor';
            }
            
            // Barcode generation
            if (id.includes('node_modules/jsbarcode')) {
              return 'barcode-vendor';
            }
          },
        },
      },
      // Minification
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production', // Remove console.log in production
          drop_debugger: true,
        },
      },
    },
  };
});
