
// Interface for the standard Sui Wallet injection (Legacy)
interface LegacySuiWalletProvider {
  requestPermissions: () => Promise<boolean>;
  getAccounts: () => Promise<string[]>;
  disconnect: () => Promise<void>;
  signAndExecuteTransactionBlock: (args: any) => Promise<any>;
}

// Interface for Wallet Standard (Modern)
interface StandardWallet {
  name: string;
  icon: string;
  version: string;
  accounts: ReadonlyArray<{ address: string; publicKey: Uint8Array }>;
  chains: string[];
  features: {
    'standard:connect': {
      connect: () => Promise<{ accounts: { address: string }[] }>;
    };
    'standard:disconnect'?: {
      disconnect: () => Promise<void>;
    };
    'sui:signAndExecuteTransactionBlock'?: {
      signAndExecuteTransactionBlock: (input: any) => Promise<any>;
    };
  };
}

// Global Window Augmentation
declare global {
  interface Window {
    suiWallet?: LegacySuiWalletProvider;
    suiet?: any; 
    sui?: any; 
  }
  interface Navigator {
    getWallets?: () => StandardWallet[];
  }
}

// --- WALLET DETECTION LOGIC ---

// Cache discovered wallets to avoid losing them
let detectedWallets: StandardWallet[] = [];
let activeWalletAdapter: any = null; // Store the active adapter for signing

// Listener for the 'standard:register-wallet' event
if (typeof window !== 'undefined') {
  window.addEventListener('wallet-standard:register-wallet', (event: any) => {
    const registerCallback = event.detail;
    registerCallback({
      register: (wallet: StandardWallet) => {
        if (!detectedWallets.find(w => w.name === wallet.name)) {
          detectedWallets.push(wallet);
        }
      }
    });
  });
}

/**
 * Helpers to find wallets in the environment
 */
const getStandardWallets = (): StandardWallet[] => {
  // 1. Check cache from event listeners
  let all = [...detectedWallets];

  // 2. Check navigator.getWallets() if available
  if (navigator.getWallets) {
    const navWallets = navigator.getWallets();
    navWallets.forEach(w => {
      if (!all.find(existing => existing.name === w.name)) {
        all.push(w);
      }
    });
  }
  return all;
};

const hasLegacyWallet = () => {
  return !!(window.suiWallet || window.suiet || window.sui);
};

/**
 * Checks if wallet is installed (Non-blocking check)
 */
export const checkSuiWalletInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  const standard = getStandardWallets().some(w => w.name.toLowerCase().includes('sui'));
  return standard || hasLegacyWallet();
};

/**
 * Waits for a wallet to appear (up to 2 seconds) to handle race conditions.
 */
const waitForWallet = async (retries = 10, delay = 200): Promise<boolean> => {
  for (let i = 0; i < retries; i++) {
    if (checkSuiWalletInstalled()) return true;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return false;
};

/**
 * Returns the active wallet adapter for signing transactions
 */
export const getWalletAdapter = () => {
  // Return the cached adapter from connection
  if (activeWalletAdapter) return activeWalletAdapter;
  
  // Fallback: check window objects directly if no standard connection was established
  if (window.suiWallet) return window.suiWallet;
  if (window.suiet) return window.suiet;
  if (window.sui) return window.sui;
  
  return null;
};

/**
 * Connects to the wallet using the best available method.
 * Includes a retry mechanism for initial injection delay.
 */
export const connectSuiWallet = async (): Promise<string | null> => {
  try {
    // 1. Wait for injection (Fixes "Extension not installed" race condition)
    const isInstalled = await waitForWallet();
    if (!isInstalled) {
       throw new Error("Sui Wallet extension not found after waiting.");
    }

    // 2. Try Standard Connection (Preferred)
    const standardWallets = getStandardWallets();
    const targetWallet = standardWallets.find(w => w.name === 'Sui Wallet') || 
                         standardWallets.find(w => w.name.toLowerCase().includes('sui'));

    if (targetWallet && targetWallet.features['standard:connect']) {
      console.log(`Connecting via Standard to: ${targetWallet.name}`);
      try {
        const result = await targetWallet.features['standard:connect'].connect();
        if (result.accounts && result.accounts.length > 0) {
          // Wrap Standard Wallet to look like a Signer for convenience
          activeWalletAdapter = {
            signAndExecuteTransactionBlock: async (input: any) => {
              if (targetWallet.features['sui:signAndExecuteTransactionBlock']) {
                return await targetWallet.features['sui:signAndExecuteTransactionBlock'].signAndExecuteTransactionBlock({
                   ...input,
                   account: targetWallet.accounts[0],
                   chain: targetWallet.chains[0]
                });
              }
              throw new Error("Wallet does not support signing");
            }
          };
          return result.accounts[0].address;
        }
      } catch (err) {
        console.warn("Standard connect failed, trying legacy...", err);
      }
    }

    // 3. Try Legacy window.suiWallet
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
      const result = await window.suiet.connect();
      if (result?.data?.[0]) {
        activeWalletAdapter = window.suiet;
        return result.data[0];
      }
    }

    throw new Error("Wallet found but connection failed or was rejected.");

  } catch (error) {
    console.error("Wallet Connection Error:", error);
    throw error;
  }
};

export const disconnectSuiWallet = async (): Promise<void> => {
  activeWalletAdapter = null;
  try {
    // Try Standard Disconnect
    const standardWallets = getStandardWallets();
    const target = standardWallets.find(w => w.name === 'Sui Wallet');
    if (target?.features?.['standard:disconnect']) {
       await target.features['standard:disconnect'].disconnect();
       return;
    }
    
    // Try Legacy Disconnect
    if (window.suiWallet) await window.suiWallet.disconnect();
    else if (window.suiet) await window.suiet.disconnect();
    
  } catch (e) {
    console.warn("Disconnect failed or not supported", e);
  }
};
