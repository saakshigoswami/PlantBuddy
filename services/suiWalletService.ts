
// services/suiWalletService.ts

// Interface for the standard Sui Wallet injection (Legacy)
interface LegacySuiWalletProvider {
  requestPermissions: () => Promise<boolean>;
  getAccounts: () => Promise<string[]>;
  disconnect: () => Promise<void>;
  signAndExecuteTransactionBlock: (args: any) => Promise<any>;
}

// Global Window Augmentation
declare global {
  interface Window {
    suiWallet?: LegacySuiWalletProvider;
    suiet?: any; 
    sui?: any; 
  }
  interface Navigator {
    getWallets?: () => any[];
  }
}

// Cache active adapter
let activeWalletAdapter: any = null;

/**
 * Checks if wallet is installed
 */
export const checkSuiWalletInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check Legacy Injections (most common patterns)
  if (window.suiWallet || window.suiet || window.sui) return true;

  // Check Standard API (Wallet Standard)
  if (typeof navigator !== 'undefined' && navigator.getWallets) {
    try {
      const wallets = navigator.getWallets();
      if (wallets && Array.isArray(wallets) && wallets.length > 0) return true;
    } catch (e) {
      // Silently fail if getWallets throws
    }
  }

  // Check for wallet objects that might be injected differently
  // Some wallets inject as window.__suiWallet or other patterns
  const walletKeys = Object.keys(window).filter(key => 
    key.toLowerCase().includes('sui') || key.toLowerCase().includes('wallet')
  );
  if (walletKeys.length > 0) {
    // Check if any of these keys have wallet-like properties
    for (const key of walletKeys) {
      const obj = (window as any)[key];
      if (obj && (typeof obj.requestPermissions === 'function' || 
                  typeof obj.connect === 'function' ||
                  typeof obj.getAccounts === 'function')) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Waits for a wallet to appear (Polling mechanism)
 * Prevents race conditions without crashing the extension
 */
const waitForWallet = async (): Promise<boolean> => {
  // First check immediately
  if (checkSuiWalletInstalled()) return true;
  
  // Retry for 10 seconds (100 * 100ms) - increased timeout
  let retries = 100; 
  while (retries > 0) {
    if (checkSuiWalletInstalled()) return true;
    await new Promise(resolve => setTimeout(resolve, 100));
    retries--;
  }
  return false;
};

/**
 * Returns the active wallet adapter for signing transactions
 */
export const getWalletAdapter = () => {
  if (activeWalletAdapter) return activeWalletAdapter;
  // Fallback to global objects if adapter was reset
  if (window.suiWallet) return window.suiWallet;
  if (window.suiet) return window.suiet;
  if (window.sui) return window.sui;
  return null;
};

/**
 * Connects to the wallet
 */
export const connectSuiWallet = async (): Promise<string | null> => {
  try {
    // 1. Wait for injection
    const found = await waitForWallet();
    if (!found) {
       console.warn("Wallet not detected via polling (timeout). Attempting connection anyway...");
    }

    // 2. Try Standard (navigator.getWallets) - Preferred Method
    if (typeof navigator !== 'undefined' && navigator.getWallets) {
      try {
        const wallets = navigator.getWallets();
        if (wallets && Array.isArray(wallets) && wallets.length > 0) {
          // Find ANY wallet that supports connection, prioritizing Sui
          const standardWallet = wallets.find((w: any) => {
            const hasFeature = w.features && w.features['standard:connect'];
            // If we found one, great. If it's specifically SUI, even better.
            return hasFeature; 
          });

          if (standardWallet) {
            console.log("Connecting via Standard Wallet:", standardWallet.name);
            try {
              const result = await standardWallet.features['standard:connect'].connect();
              if (result && result.accounts && result.accounts[0]) {
                // Create a wrapper for signing
                activeWalletAdapter = {
                  signAndExecuteTransactionBlock: async (input: any) => {
                    // Check for specific Sui feature
                    if (standardWallet.features['sui:signAndExecuteTransactionBlock']) {
                      return await standardWallet.features['sui:signAndExecuteTransactionBlock'].signAndExecuteTransactionBlock({
                        ...input,
                        account: result.accounts[0],
                        chain: standardWallet.chains?.[0]
                      });
                    }
                    throw new Error("Signing not supported by this standard wallet");
                  }
                };
                return result.accounts[0].address;
              }
            } catch(e) { 
              console.warn("Standard connect failed, falling back to legacy:", e); 
            }
          }
        }
      } catch (e) {
        console.warn("Error accessing navigator.getWallets:", e);
      }
    }

    // 3. Try Legacy window.suiWallet (Official Sui Wallet)
    if (window.suiWallet) {
      console.log("Connecting via Legacy suiWallet...");
      try {
        const hasPermissions = await window.suiWallet.requestPermissions();
        if (hasPermissions) {
          const accounts = await window.suiWallet.getAccounts();
          if (accounts && accounts.length > 0) {
            activeWalletAdapter = window.suiWallet;
            return accounts[0];
          }
        }
      } catch (e) {
        console.warn("Legacy suiWallet connection failed:", e);
      }
    }

    // 4. Try SuiET
    if (window.suiet) {
      console.log("Connecting via SuiET...");
      try {
        const res = await window.suiet.connect();
        if (res?.data?.[0]) {
          activeWalletAdapter = window.suiet;
          return res.data[0];
        }
      } catch (e) {
        console.warn("Suiet connection failed:", e);
      }
    }

    // 5. Try window.sui (some wallet variants)
    if (window.sui) {
      console.log("Connecting via window.sui...");
      try {
        if (typeof window.sui.connect === 'function') {
          const res = await window.sui.connect();
          if (res?.accounts?.[0]?.address) {
            activeWalletAdapter = window.sui;
            return res.accounts[0].address;
          }
        } else if (typeof window.sui.requestPermissions === 'function') {
          const hasPermissions = await window.sui.requestPermissions();
          if (hasPermissions) {
            const accounts = await window.sui.getAccounts();
            if (accounts && accounts.length > 0) {
              activeWalletAdapter = window.sui;
              return accounts[0];
            }
          }
        }
      } catch (e) {
        console.warn("window.sui connection failed:", e);
      }
    }

    // 6. Try to find any wallet-like object in window
    const walletKeys = Object.keys(window).filter(key => 
      key.toLowerCase().includes('sui') || key.toLowerCase().includes('wallet')
    );
    for (const key of walletKeys) {
      const obj = (window as any)[key];
      if (obj && typeof obj === 'object') {
        try {
          if (typeof obj.requestPermissions === 'function') {
            console.log(`Trying to connect via ${key}...`);
            const hasPermissions = await obj.requestPermissions();
            if (hasPermissions) {
              const accounts = await obj.getAccounts();
              if (accounts && accounts.length > 0) {
                activeWalletAdapter = obj;
                return accounts[0];
              }
            }
          } else if (typeof obj.connect === 'function') {
            console.log(`Trying to connect via ${key}...`);
            const res = await obj.connect();
            if (res?.accounts?.[0]?.address) {
              activeWalletAdapter = obj;
              return res.accounts[0].address;
            } else if (res?.data?.[0]) {
              activeWalletAdapter = obj;
              return res.data[0];
            }
          }
        } catch (e) {
          // Continue to next wallet
          console.debug(`Failed to connect via ${key}:`, e);
        }
      }
    }

    throw new Error("No compatible Sui Wallet found. Please install the Sui Wallet extension.");

  } catch (error) {
    console.error("Wallet Connection Error:", error);
    throw error;
  }
};

export const disconnectSuiWallet = async (): Promise<void> => {
  activeWalletAdapter = null;
  try {
    if (window.suiWallet) await window.suiWallet.disconnect();
    else if (window.suiet) await window.suiet.disconnect();
  } catch (e) {
    console.warn("Disconnect failed", e);
  }
};
