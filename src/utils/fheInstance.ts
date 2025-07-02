import { initSDK, createInstance, SepoliaConfig } from '@zama-fhe/relayer-sdk/bundle';

let fheInstance: any = null;

export async function initializeFheInstance() {
  await initSDK(); // Loads WASM
  const config = { ...SepoliaConfig, network: window.ethereum };
  console.log('FHE SDK config:', config);
  fheInstance = await createInstance(config);
  console.log('FHE instance methods:', Object.keys(fheInstance));
  return fheInstance;
}

export function getFheInstance() {
  return fheInstance;
} 