import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import './index.css'
import App from './App.tsx'
import { config } from './config'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrivyProvider
      appId={config.privyAppId}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#000',
        },
        loginMethods: ['wallet', 'email'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
        defaultChain: {
          id: config.baseSepolia.chainId,
          name: config.baseSepolia.name,
          network: 'base-sepolia',
          nativeCurrency: {
            name: 'ETH',
            symbol: 'ETH',
            decimals: 18,
          },
          rpcUrls: {
            default: { http: [config.baseSepolia.rpcUrl] },
            public: { http: [config.baseSepolia.rpcUrl] },
          },
          blockExplorers: {
            default: {
              name: 'BaseScan',
              url: config.baseSepolia.blockExplorer
            },
          },
          testnet: true,
        },
        supportedChains: [
          {
            id: config.baseSepolia.chainId,
            name: config.baseSepolia.name,
            network: 'base-sepolia',
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: {
              default: { http: [config.baseSepolia.rpcUrl] },
              public: { http: [config.baseSepolia.rpcUrl] },
            },
            blockExplorers: {
              default: {
                name: 'BaseScan',
                url: config.baseSepolia.blockExplorer
              },
            },
            testnet: true,
          },
        ],
      }}
    >
      <App />
    </PrivyProvider>
  </StrictMode>,
)
