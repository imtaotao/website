/// <reference types="vite/client" />

declare module '*.mdx?raw' {
  const content: string;
  export default content;
}

declare module 'virtual:resume-json' {
  const content: string;
  export default content;
}

interface Window {
  __APP_BASE__?: string;
}
