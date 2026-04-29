/// <reference types="vite/client" />

declare module '*.mdx?raw' {
  const content: string;
  export default content;
}

declare global {
  interface Window {
    __APP_BASE__?: string;
  }
}

export {};
