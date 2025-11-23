
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
 * Debug function to log all available wallet objects
 */
const debugWalletObjects = () => {
  console.log("=== Wallet Detection Debug ===");
  console.log("window.suiWallet:", window.suiWallet);
  console.log("window.suiet:", window.suiet);
  console.log("window.sui:", window.sui);
  console.log("navigator.getWallets:", typeof navigator !== 'undefined' ? navigator.getWallets : 'undefined');
  
  if (typeof navigator !== 'undefined' && navigator.getWallets) {
    try {
      const wallets = navigator.getWallets();
      console.log("Standard wallets:", wallets);
    } catch (e) {
      console.log("Error getting wallets:", e);
    }
  }
  
  // Check for any wallet-like objects
  const walletKeys = Object.keys(window).filter(key => 
    key.toLowerCase().includes('sui') || 
    key.toLowerCase().includes('wallet') ||
    key.toLowerCase().includes('suiwallet')
  );
  console.log("Wallet-like keys found:", walletKeys);
  walletKeys.forEach(key => {
    console.log(`  ${key}:`, (window as any)[key]);
  });
  console.log("=== End Debug ===");
};

/**
 * Checks if wallet is installed
 */
export const checkSuiWalletInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check Legacy Injections
  if (window.suiWallet || window.suiet || window.sui) {
    console.log("Wallet detected via legacy injection");
    return true;
  }

  // Check Standard API
  if (typeof navigator !== 'undefined' && navigator.getWallets) {
    try {
      const wallets = navigator.getWallets();
      if (wallets && Array.isArray(wallets) && wallets.length > 0) {
        console.log("Wallet detected via standard API:", wallets.length, "wallets");
        return true;
      }
    } catch (e) {
      // Silently fail
    }
  }

  // Check for any wallet-like objects in window
  const walletKeys = Object.keys(window).filter(key => 
    key.toLowerCase().includes('sui') || 
    key.toLowerCase().includes('wallet') ||
    key.toLowerCase().includes('suiwallet')
  );
  
  for (const key of walletKeys) {
    const obj = (window as any)[key];
    if (obj && typeof obj === 'object') {
      // Check for wallet-like methods
      if (typeof obj.requestPermissions === 'function' || 
          typeof obj.connect === 'function' ||
          typeof obj.getAccounts === 'function' ||
          typeof obj.hasPermissions === 'function') {
        console.log(`Wallet detected via dynamic search: ${key}`);
        return true;
      }
    }
  }

  return false;
};

/**
 * Waits for a wallet to appear (Polling mechanism with event listeners)
 * Prevents race conditions without crashing the extension
 */
const waitForWallet = async (): Promise<boolean> => {
  // First check immediately
  if (checkSuiWalletInstalled()) return true;
  
  // Set up event listener for wallet injection (some wallets use this)
  let walletFound = false;
  const checkWallet = () => {
    if (checkSuiWalletInstalled()) {
      walletFound = true;
    }
  };
  
  // Listen for custom events that wallets might dispatch
  const handleWalletEvent = () => {
    checkWallet();
  };
  
  // Add event listeners
  window.addEventListener('suiWallet#initialized', handleWalletEvent);
  window.addEventListener('wallet-standard:app-ready', handleWalletEvent);
  
  // Also poll more aggressively - check every 50ms for 15 seconds (300 checks)
  let retries = 300; 
  while (retries > 0 && !walletFound) {
    checkWallet();
    if (walletFound) break;
    await new Promise(resolve => setTimeout(resolve, 50));
    retries--;
  }
  
  // Clean up event listeners
  window.removeEventListener('suiWallet#initialized', handleWalletEvent);
  window.removeEventListener('wallet-standard:app-ready', handleWalletEvent);
  
  return walletFound;
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
    // Debug: Log all available wallet objects
    console.log("🔍 Starting wallet detection...");
    debugWalletObjects();
    
    // 1. Wait for injection with longer timeout and event listeners
    console.log("⏳ Waiting for wallet injection (up to 15 seconds)...");
    const found = await waitForWallet();
    if (!found) {
       console.warn("⚠️ Wallet not detected via polling (timeout). Attempting connection anyway...");
       console.warn("💡 This usually means the extension isn't injecting. Check the troubleshooting steps below.");
       // Debug again after timeout
       debugWalletObjects();
       
       // Give it one more second - sometimes extensions inject right after page load
       console.log("⏳ Giving extension one more second to inject...");
       await new Promise(resolve => setTimeout(resolve, 1000));
       if (checkSuiWalletInstalled()) {
         console.log("✅ Wallet detected after additional wait!");
       } else {
         debugWalletObjects();
       }
    } else {
      console.log("✅ Wallet detected!");
    }

    // 2. Try Standard (navigator.getWallets) - Preferred Method
    if (typeof navigator !== 'undefined' && navigator.getWallets) {
      try {
        const wallets = navigator.getWallets();
        console.log("Standard wallets available:", wallets?.length || 0);
        
        if (wallets && Array.isArray(wallets) && wallets.length > 0) {
          // Find ANY wallet that supports connection
          const standardWallet = wallets.find((w: any) => {
            return w.features && w.features['standard:connect'];
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
          } else {
            console.log("No standard wallet with connect feature found");
          }
        }
      } catch (e) {
        console.warn("Error accessing navigator.getWallets:", e);
      }
    } else {
      console.log("navigator.getWallets not available");
    }

    // 3. Try Legacy window.suiWallet (Official)
    if (window.suiWallet) {
      console.log("Connecting via Legacy suiWallet...");
      try {
        // Check if already has permissions
        let hasPermissions = false;
        try {
          const accounts = await window.suiWallet.getAccounts();
          if (accounts && accounts.length > 0) {
            console.log("Already has permissions, accounts:", accounts);
            activeWalletAdapter = window.suiWallet;
            return accounts[0];
          }
        } catch (e) {
          console.log("No existing accounts, requesting permissions...");
        }
        
        // Request permissions if needed
        hasPermissions = await window.suiWallet.requestPermissions();
        if (hasPermissions) {
          const accounts = await window.suiWallet.getAccounts();
          if (accounts && accounts.length > 0) {
            activeWalletAdapter = window.suiWallet;
            return accounts[0];
          }
        } else {
          console.warn("Permission request was rejected");
        }
      } catch (e) {
        console.error("Error connecting via suiWallet:", e);
      }
    } else {
      console.log("window.suiWallet not available");
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
        console.error("Error connecting via SuiET:", e);
      }
    } else {
      console.log("window.suiet not available");
    }
    
    // 5. Try Generic window.sui (Some experimental wallets)
    if (window.sui) {
      console.log("Connecting via Generic window.sui...");
      try {
        if (typeof window.sui.connect === 'function') {
          const res = await window.sui.connect();
          if (res?.data?.[0]) {
            activeWalletAdapter = window.sui;
            return res.data[0];
          } else if (res?.accounts?.[0]?.address) {
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
        console.error("Error connecting via window.sui:", e);
      }
    } else {
      console.log("window.sui not available");
    }
    
    // 6. Try to find any wallet-like object dynamically
    const walletKeys = Object.keys(window).filter(key => 
      key.toLowerCase().includes('sui') || 
      key.toLowerCase().includes('wallet') ||
      key.toLowerCase().includes('suiwallet')
    );
    
    console.log("Trying dynamic wallet discovery, found keys:", walletKeys);
    for (const key of walletKeys) {
      const obj = (window as any)[key];
      if (obj && typeof obj === 'object' && obj !== window.suiWallet && obj !== window.suiet && obj !== window.sui) {
        try {
          console.log(`Attempting connection via ${key}...`);
          
          if (typeof obj.requestPermissions === 'function') {
            const hasPermissions = await obj.requestPermissions();
            if (hasPermissions) {
              const accounts = await obj.getAccounts();
              if (accounts && accounts.length > 0) {
                console.log(`Successfully connected via ${key}`);
                activeWalletAdapter = obj;
                return accounts[0];
              }
            }
          } else if (typeof obj.connect === 'function') {
            const res = await obj.connect();
            if (res?.data?.[0]) {
              console.log(`Successfully connected via ${key}`);
              activeWalletAdapter = obj;
              return res.data[0];
            } else if (res?.accounts?.[0]?.address) {
              console.log(`Successfully connected via ${key}`);
              activeWalletAdapter = obj;
              return res.accounts[0].address;
            }
          } else if (typeof obj.getAccounts === 'function') {
            // Try to get accounts directly (might already be connected)
            const accounts = await obj.getAccounts();
            if (accounts && accounts.length > 0) {
              console.log(`Successfully connected via ${key} (already connected)`);
              activeWalletAdapter = obj;
              return accounts[0];
            }
          }
        } catch (e) {
          console.debug(`Failed to connect via ${key}:`, e);
        }
      }
    }

    // Provide detailed error message with troubleshooting steps
    const errorMessage = `No compatible Sui Wallet found. 

Troubleshooting steps:
1. Make sure the Sui Wallet extension is installed and enabled
   - Go to chrome://extensions/ (or edge://extensions/)
   - Find "Sui Wallet" and ensure it's enabled
   - Click the refresh icon on the extension to reload it

2. Unlock your wallet
   - Open the Sui Wallet extension popup
   - Make sure it's unlocked and ready

3. Refresh this page after enabling the extension
   - Press Ctrl+Shift+R (or Cmd+Shift+R on Mac) for a hard refresh

4. Check browser permissions
   - Some browsers require explicit permission for extensions to inject scripts
   - Try disabling other extensions that might interfere

5. Try a different browser
   - If using Chrome, try Edge or Firefox (with Sui Wallet installed)

If the extension is installed and enabled but still not detected, there may be a compatibility issue.`;

    console.error(errorMessage);
    throw new Error(errorMessage);

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

/**
 * Helper function to manually check wallet status (can be called from console)
 * Usage: In browser console, type: window.checkWalletStatus()
 */
export const checkWalletStatus = () => {
  console.log("=== Manual Wallet Status Check ===");
  debugWalletObjects();
  
  const status = {
    suiWallet: !!window.suiWallet,
    suiet: !!window.suiet,
    sui: !!window.sui,
    standardAPI: typeof navigator !== 'undefined' && !!navigator.getWallets,
    detected: checkSuiWalletInstalled()
  };
  
  console.log("Status Summary:", status);
  
  if (!status.detected) {
    console.log("\n❌ Wallet not detected. Please:");
    console.log("1. Go to chrome://extensions/");
    console.log("2. Find 'Sui Wallet' extension");
    console.log("3. Make sure it's enabled (toggle should be blue/on)");
    console.log("4. Click the refresh icon (🔄) on the extension");
    console.log("5. Unlock your wallet in the extension popup");
    console.log("6. Refresh this page (Ctrl+Shift+R)");
  } else {
    console.log("\n✅ Wallet detected!");
  }
  
  return status;
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).checkWalletStatus = checkWalletStatus;
}
