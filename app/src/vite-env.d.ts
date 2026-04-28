/// <reference types="vite/client" />

declare global {
  interface Window {
    __APP_BASE__?: string;
  }
}

export {};
