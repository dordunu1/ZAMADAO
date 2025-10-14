// TypeScript declarations for CDN imports
declare module 'https://cdn.zama.ai/relayer-sdk-js/0.2.0/relayer-sdk-js.js' {
  export function initSDK(): Promise<void>;
  export function createInstance(config: unknown): Promise<unknown>;
  export const SepoliaConfig: unknown;
}
