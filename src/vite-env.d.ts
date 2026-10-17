/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional override for the dev proxy target; set in the shell, not committed. */
  readonly VITE_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
