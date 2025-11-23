
// Interface for the standard Sui Wallet injection (Legacy)
interface LegacySuiWalletProvider {
  requestPermissions: () => Promise<boolean>;
  getAccounts: () => Promise<string[]>;
  disconnect: () => Promise<void>;
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
  };
}

// Extend window interface
declare global {
  interface Window {
    suiWallet?: LegacySuiWalletProvider;
    suiet?: any; // Support for SuiET wallet
    sui?: any; // Generic injection
  }
  interface Navigator {
    getWallets?: () => StandardWallet[];
  }
}

/**
 * Checks if ANY compatible Sui wallet is installed via Standard or Legacy methods.
 */
export const checkSuiWalletInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;

  // 1. Check Wallet Standard
  if (navigator.getWallets) {
    const wallets = navigator.getWallets();
    const hasSuiWallet = wallets.some(w => w.name.toLowerCase().includes('sui'));
    if (hasSuiWallet) return true;
  }

  // 2. Check Legacy Injections
  return !!(window.suiWallet || window.suiet || window.sui);
};

/**
 * Connects to the wallet using the best available method.
 */
export const connectSuiWallet = async (): Promise<string | null> => {
  try {
    // STRATEGY 1: Wallet Standard (Preferred for Official Sui Wallet)
    if (navigator.getWallets) {
      const wallets = navigator.getWallets();
      // Find the official Sui Wallet or any wallet with 'Sui' in name
      const targetWallet = wallets.find(w => w.name === 'Sui Wallet') || 
                           wallets.find(w => w.name.toLowerCase().includes('sui'));
      
      if (targetWallet && targetWallet.features['standard:connect']) {
        console.log(`Connecting via Standard to: ${targetWallet.name}`);
        const result = await targetWallet.features['standard:connect'].connect();
        if (result.accounts && result.accounts.length > 0) {
          return result.accounts[0].address;
        }
      }
    }

    // STRATEGY 2: Legacy window.suiWallet (Older versions)
    if (window.suiWallet) {
      console.log("Connecting via Legacy suiWallet...");
      const hasPermissions = await window.suiWallet.requestPermissions();
      if (hasPermissions) {
        const accounts = await window.suiWallet.getAccounts();
        if (accounts && accounts.length > 0) return accounts[0];
      }
    }

    // STRATEGY 3: SuiET Wallet
    if (window.suiet) {
      console.log("Connecting via SuiET...");
      const result = await window.suiet.connect();
      if (result && result.data && result.data.length > 0) {
        return result.data[0]; // SuiET returns address directly in data array sometimes
      }
    }

    // If we reached here, we found a provider but failed to connect or user rejected
    if (checkSuiWalletInstalled()) {
       throw new Error("User rejected connection or wallet did not return accounts.");
    } else {
       throw new Error("Sui Wallet extension not found");
    }

  } catch (error) {
    console.error("Wallet Connection Error:", error);
    throw error;
  }
};

export const disconnectSuiWallet = async (): Promise<void> => {
  try {
    // Try Standard Disconnect
    if (navigator.getWallets) {
       const wallets = navigator.getWallets();
       const target = wallets.find(w => w.name === 'Sui Wallet');
       if (target && target.features['standard:disconnect']) {
         await target.features['standard:disconnect'].disconnect();
         return;
       }
    }
    
    // Try Legacy Disconnect
    if (window.suiWallet) {
      await window.suiWallet.disconnect();
    } else if (window.suiet) {
      await window.suiet.disconnect();
    }
  } catch (e) {
    console.warn("Disconnect failed or not supported", e);
  }
};
