
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
  
  // Check Legacy
  if (window.suiWallet || window.suiet || window.sui) return true;

  // Check Standard
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
  let retries = 20; // Wait up to 4 seconds
  while (retries > 0) {
    if (checkSuiWalletInstalled()) return true;
    await new Promise(resolve => setTimeout(resolve, 200));
    retries--;
  }
  return false;
};

/**
 * Returns the active wallet adapter for signing transactions
 */
export const getWalletAdapter = () => {
  if (activeWalletAdapter) return activeWalletAdapter;
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
       console.warn("Wallet not detected via polling.");
       // Don't throw yet, try one last check
    }

    // 2. Try Legacy window.suiWallet (Official & Most reliable for basic use)
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
        console.warn("Legacy connect rejected", e);
        throw e;
      }
    }

    // 3. Try Standard (navigator.getWallets)
    if (navigator.getWallets) {
      const wallets = navigator.getWallets();
      const suiWallet = wallets.find((w: any) => w.name.toLowerCase().includes('sui'));
      if (suiWallet && suiWallet.features && suiWallet.features['standard:connect']) {
         console.log("Connecting via Standard:", suiWallet.name);
         try {
           const result = await suiWallet.features['standard:connect'].connect();
           if (result.accounts[0]) {
             // Create a wrapper for signing
             activeWalletAdapter = {
               signAndExecuteTransactionBlock: async (input: any) => {
                 if (suiWallet.features['sui:signAndExecuteTransactionBlock']) {
                   return await suiWallet.features['sui:signAndExecuteTransactionBlock'].signAndExecuteTransactionBlock({
                     ...input,
                     account: result.accounts[0],
                     chain: suiWallet.chains?.[0]
                   });
                 }
                 throw new Error("Signing not supported by this standard wallet");
               }
             };
             return result.accounts[0].address;
           }
         } catch(e) { console.warn("Standard connect failed", e); }
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
      } catch (e) { console.warn("SuiET connect failed", e); }
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
