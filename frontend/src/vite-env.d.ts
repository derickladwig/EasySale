/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_PORT: string;
  readonly VITE_REACT_DEVTOOLS: string;
  readonly VITE_BUILD_VARIANT: 'lite' | 'export' | 'full';
  readonly VITE_APP_VERSION: string;
  readonly VITE_BUILD_HASH: string;
  readonly VITE_BUILD_DATE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
