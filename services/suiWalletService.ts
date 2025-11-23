
// Interface for the standard Sui Wallet injection
interface SuiWalletProvider {
  requestPermissions: () => Promise<boolean>;
  getAccounts: () => Promise<string[]>;
  disconnect: () => Promise<void>;
}

// Extend window interface to include suiWallet
declare global {
  interface Window {
    suiWallet?: SuiWalletProvider;
  }
}

export const checkSuiWalletInstalled = (): boolean => {
  return typeof window !== 'undefined' && !!window.suiWallet;
};

export const connectSuiWallet = async (): Promise<string | null> => {
  try {
    if (!checkSuiWalletInstalled()) {
      throw new Error("Sui Wallet extension not found");
    }

    const provider = window.suiWallet!;

    // Request permission to connect
    const hasPermissions = await provider.requestPermissions();
    
    if (hasPermissions) {
      const accounts = await provider.getAccounts();
      if (accounts && accounts.length > 0) {
        return accounts[0]; // Return the first address
      }
    }
    
    return null;
  } catch (error) {
    console.error("Wallet Connection Error:", error);
    throw error;
  }
};

export const disconnectSuiWallet = async (): Promise<void> => {
  if (checkSuiWalletInstalled()) {
    try {
      await window.suiWallet!.disconnect();
    } catch (e) {
      console.warn("Disconnect failed or not supported", e);
    }
  }
};
