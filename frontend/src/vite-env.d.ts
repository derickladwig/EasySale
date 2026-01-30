/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_PORT: string;
  readonly VITE_REACT_DEVTOOLS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
