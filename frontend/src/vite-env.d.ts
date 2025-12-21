/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  // Legacy support
  readonly REACT_APP_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

