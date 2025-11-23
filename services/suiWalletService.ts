
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
  
  // Check Legacy Injections
  if (window.suiWallet || window.suiet || window.sui) return true;

  // Check Standard API
  if (navigator.getWallets) {
    const wallets = navigator.getWallets();
    if (wallets && wallets.length > 0) return true;
  }

  return false;
};

/**
 * Waits for a wallet to appear (Polling mechanism)
 * Prevents race conditions without crashing the extension
 */
const waitForWallet = async (): Promise<boolean> => {
  // Retry for 10 seconds (100 * 100ms) to ensure slow extensions load
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
    if (navigator.getWallets) {
      const wallets = navigator.getWallets();
      // Find ANY wallet that supports connection
      const standardWallet = wallets.find((w: any) => {
         return w.features && w.features['standard:connect'];
      });

      if (standardWallet) {
         console.log("Connecting via Standard Wallet:", standardWallet.name);
         try {
           const result = await standardWallet.features['standard:connect'].connect();
           if (result.accounts[0]) {
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

    // 3. Try Legacy window.suiWallet (Official)
    if (window.suiWallet) {
      console.log("Connecting via Legacy suiWallet...");
      const hasPermissions = await window.suiWallet.requestPermissions();
      if (hasPermissions) {
        const accounts = await window.suiWallet.getAccounts();
        if (accounts && accounts.length > 0) {
          activeWalletAdapter = window.suiWallet;
          return accounts[0];
        }
      }
    }

    // 4. Try SuiET
    if (window.suiet) {
      console.log("Connecting via SuiET...");
      const res = await window.suiet.connect();
      if (res?.data?.[0]) {
        activeWalletAdapter = window.suiet;
        return res.data[0];
      }
    }
    
    // 5. Try Generic window.sui (Some experimental wallets)
    if (window.sui && window.sui.connect) {
       console.log("Connecting via Generic window.sui...");
       const res = await window.sui.connect();
        if (res?.data?.[0]) {
            activeWalletAdapter = window.sui;
            return res.data[0];
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
