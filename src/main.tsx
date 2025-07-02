import './index.css';
import '@rainbow-me/rainbowkit/styles.css';
import { createRoot } from 'react-dom/client';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { sepolia } from 'wagmi/chains';
import App from './App';

const config = getDefaultConfig({
  appName: 'ZAMA DAO',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  chains: [sepolia],
});

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider>
        <App />
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);
