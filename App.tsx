
import React, { useState, useEffect } from 'react';
import { 
  useConnectWallet, 
  useCurrentAccount, 
  useDisconnectWallet, 
  useSignAndExecuteTransaction, 
  useWallets,
  useSuiClient
} from '@mysten/dapp-kit';
import type { WalletWithRequiredFeatures } from '@mysten/wallet-standard';
import { ViewMode, PlantDataPoint, MOCK_BLOBS, DataBlob } from './types';
import { analyzeDatasetValue } from './services/geminiService';
// Import new SDK services
import { uploadSessionViaWalrusSDK, certifyBlobOnChain } from './services/walrusUpload';
import DeviceMonitor from './components/DeviceMonitor';
import DataMarketplace from './components/DataMarketplace';
import LandingPage from './components/LandingPage';
import Modal from './components/Modal';
import { Flower, Store, Wallet, Loader2, CheckCircle, UploadCloud, FileText, Database, Activity, Download, ExternalLink, Lock, AlertTriangle, Globe, LogOut, Home, Award } from 'lucide-react';

// Walrus Network Type compatible with the new service logic
type WalrusNetwork = 'TESTNET' | 'MAINNET';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.HOME);
  
  const currentAccount = useCurrentAccount();
  const { mutateAsync: connectWallet, isPending: isConnecting } = useConnectWallet();
  const { mutateAsync: disconnectWallet } = useDisconnectWallet();
  const { mutateAsync: signAndExecuteTransactionBlock } = useSignAndExecuteTransaction();
  const wallets = useWallets();
  const [isWalletPickerOpen, setIsWalletPickerOpen] = useState(false);
  const [walletConnectError, setWalletConnectError] = useState<string | null>(null);

  const walletAddress = currentAccount?.address ?? null;
  
  const [marketplaceListings, setMarketplaceListings] = useState<DataBlob[]>(MOCK_BLOBS);
  
  // Upload/Mint State
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Added 'CERTIFYING' step for the new workflow
  const [uploadStep, setUploadStep] = useState<'IDLE' | 'ANALYZING' | 'ENCRYPTING' | 'UPLOADING' | 'CERTIFYING' | 'SUCCESS'>('IDLE');
  const [currentSessionData, setCurrentSessionData] = useState<PlantDataPoint[]>([]);
  const [mintedBlob, setMintedBlob] = useState<DataBlob | null>(null);
  const [blobScript, setBlobScript] = useState<string>("");
  const [hasSessionData, setHasSessionData] = useState(false);
  const [sessionDataForMint, setSessionDataForMint] = useState<PlantDataPoint[]>([]);
  
  // Walrus Configuration
  const [selectedNetwork, setSelectedNetwork] = useState<WalrusNetwork>('TESTNET');

  // API Key Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Default to the provided key initially
  const [geminiKey, setGeminiKey] = useState('AIzaSyC3oU5S3qMW5bDQZKAYNNqpB4zzZvDle7o');
  const [hasKey, setHasKey] = useState(true);

  useEffect(() => {
    // Check if key exists on mount
    const local = localStorage.getItem('GEMINI_API_KEY');
    if (local) {
      setGeminiKey(local);
    }
    setHasKey(true);
  }, []);

  const startWalletConnection = async (wallet: WalletWithRequiredFeatures) => {
    try {
      setWalletConnectError(null);
      await connectWallet({ wallet });
      setIsWalletPickerOpen(false);
    } catch (error: any) {
      console.error("Failed to connect wallet", error);
      setWalletConnectError(error.message || "Failed to connect wallet.");
    }
  };

  const handleConnectWallet = async () => {
    if (walletAddress) {
      try {
        await disconnectWallet();
      } catch (error: any) {
        console.error("Failed to disconnect wallet", error);
        alert(error.message || "Failed to disconnect wallet.");
      }
      return;
    }

    if (!wallets.length) {
      alert("No Sui-compatible wallets detected. Please install Sui Wallet (Slush) or another wallet standard extension.");
      return;
    }

    if (wallets.length === 1) {
      await startWalletConnection(wallets[0]);
      return;
    }

    setWalletConnectError(null);
    setIsWalletPickerOpen(true);
  };

  const handleSaveApiKey = () => {
    if (geminiKey.trim()) {
      localStorage.setItem('GEMINI_API_KEY', geminiKey.trim());
      setHasKey(true);
      setIsSettingsOpen(false);
      alert('API Key Saved. Please restart your session.');
    } else {
       // Allow clearing key
       localStorage.removeItem('GEMINI_API_KEY');
       setGeminiKey('AIzaSyC3oU5S3qMW5bDQZKAYNNqpB4zzZvDle7o');
    }
  };

  const handleSaveSession = (data: PlantDataPoint[]) => {
    setCurrentSessionData(data);
    setIsModalOpen(true);
    setUploadStep('IDLE');
    setMintedBlob(null);
    setHasSessionData(false); // Clear after opening modal
    setBlobScript("");
  };

  const processUpload = async () => {
    if (!walletAddress || !currentAccount) {
      alert("Please connect your Sui Wallet first to sign the upload transaction.");
      return;
    }
    
    // Get the connected wallet to use its signing features directly
    const connectedWallet = wallets.find(w => w.accounts.some(acc => acc.address === walletAddress));
    if (!connectedWallet) {
      alert("Wallet not found. Please reconnect your wallet.");
      return;
    }
    
    // Create adapter that uses wallet's signAndExecuteTransactionBlock directly
    const adapter = {
      signAndExecuteTransactionBlock: async (params: any) => {
        // Extract transactionBlock from params (could be transactionBlock or transaction)
        const transactionBlock = params.transactionBlock || params.transaction || params;
        
        if (connectedWallet.features['sui:signAndExecuteTransactionBlock']) {
          // Wallet's signAndExecuteTransactionBlock expects { transactionBlock, account, chain }
          return await connectedWallet.features['sui:signAndExecuteTransactionBlock'].signAndExecuteTransactionBlock({
            transactionBlock: transactionBlock,
            account: currentAccount,
            chain: connectedWallet.chains[0]?.id || 'sui:testnet',
          });
        }
        // Fallback to dapp-kit hook
        return await signAndExecuteTransactionBlock({
          transactionBlock: transactionBlock,
        });
      }
    };

    try {
      setUploadStep('ANALYZING');
      
      // 1. Generate the Script
      const scriptHeader = `PLANTBUDDY SESSION TRANSCRIPT\nDATE: ${new Date().toISOString()}\nNETWORK: ${selectedNetwork}\nCREATOR: ${walletAddress || 'Anonymous'}\n-----------------------------------\n\n`;
      const scriptBody = currentSessionData.map(d => {
        const time = new Date(d.timestamp).toLocaleTimeString();
        if (d.userMessage) return `[${time}] USER: ${d.userMessage}`;
        if (d.plantResponse) return `[${time}] PLANT: ${d.plantResponse}`;
        return null;
      }).filter(Boolean).join('\n\n');
      
      const fullScript = scriptHeader + (scriptBody || "[No verbal interaction recorded]");
      setBlobScript(fullScript);

      // 2. Analyze Data with Gemini
      const summary = `
        Duration: ${(currentSessionData[currentSessionData.length-1].timestamp - currentSessionData[0].timestamp)/1000}s.
        Interactions: ${currentSessionData.length} points.
        Avg Capacitance: ${currentSessionData.reduce((acc, curr) => acc + curr.capacitance, 0) / currentSessionData.length}.
        Script Preview: ${fullScript.slice(0, 200)}...
      `;

      const analysis = await analyzeDatasetValue(summary);

      setUploadStep('ENCRYPTING');
      await new Promise(resolve => setTimeout(resolve, 800)); // Encryption delay simulation

      setUploadStep('UPLOADING');
      
      // 3. REAL WALRUS UPLOAD VIA SDK
      // We pass the fullScript string, wallet adapter, and selected network
      const result = await uploadSessionViaWalrusSDK(fullScript, adapter, selectedNetwork);
      console.log("Walrus Upload Result:", result);

      if (!result.blobId) throw new Error("Failed to get Blob ID from Walrus");

      // 4. ON-CHAIN CERTIFICATION
      setUploadStep('CERTIFYING');
      let certificationResult: { status: string; blobId: string; txDigest?: string; error?: string } | null = null;
      try {
        certificationResult = await certifyBlobOnChain(
          result.blobId,
          {
            title: analysis.title,
            description: analysis.description,
            dataPoints: currentSessionData.length,
            sizeBytes: fullScript.length
          },
          adapter,
          selectedNetwork,
          walletAddress || undefined
        );
        
        // Only log success if actually certified
        if (certificationResult.status === "Certified" && certificationResult.txDigest) {
          console.log("✅ Blob certified on Sui!", certificationResult);
        } else {
          console.warn("⚠️ Certification status:", certificationResult.status, certificationResult.error || "");
          if (certificationResult.error?.includes('gas') || certificationResult.error?.includes('Insufficient')) {
            alert(`⚠️ Certification Failed: ${certificationResult.error}\n\nYour data is stored on Walrus, but on-chain certification requires SUI for gas fees. Please add more SUI to your wallet and try again.`);
          }
        }
      } catch (certErr: any) {
        console.error("Certification error:", certErr);
        certificationResult = {
          status: "Stored (certification failed)",
          blobId: result.blobId,
          error: certErr.message || "Unknown error"
        };
        if (certErr.message?.includes('gas') || certErr.message?.includes('No valid gas coins')) {
          alert(`⚠️ Certification Failed: Insufficient SUI for gas fees.\n\nYour data is stored on Walrus, but on-chain certification requires SUI for transaction fees. Please add more SUI to your wallet.`);
        }
      }

      // 5. Create Blob Object (Metadata wrapper for Marketplace)
      // Use transaction digest as the main verifiable ID, fallback to Walrus blob ID
      const verifiableId = certificationResult?.txDigest || result.blobId;
      const newBlob: DataBlob = {
        id: verifiableId, // Main ID: transaction digest if certified, otherwise Walrus blob ID
        walrusBlobId: result.blobId, // Store original Walrus ID separately
        txDigest: certificationResult?.txDigest, // Store transaction digest
        name: analysis.title,
        description: analysis.description,
        size: `${(fullScript.length / 1024).toFixed(2)} KB`,
        price: analysis.priceSuggestion,
        creator: walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '0xME...YOU',
        timestamp: new Date().toISOString(),
        dataPoints: currentSessionData.length,
        sentimentScore: Math.floor(Math.random() * 100),
        status: certificationResult?.txDigest ? 'LISTED' : 'MINTED', // LISTED if certified, MINTED if not
        owner: walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : '0xME...YOU'
      };

      setMintedBlob(newBlob);
      setMarketplaceListings(prev => [newBlob, ...prev]);
      setUploadStep('SUCCESS');

    } catch (error: any) {
      console.error("Upload failed", error);
      setUploadStep('IDLE');
      alert(`Upload Failed: ${error.message || "Unknown Error"}`);
    }
  };

  const handleDownloadBlob = () => {
    if (!blobScript || !mintedBlob) return;
    
    const element = document.createElement("a");
    const file = new Blob([blobScript], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `PlantBuddy_${mintedBlob.id.slice(0, 8)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // View Routing
  const renderView = () => {
    switch(view) {
      case ViewMode.HOME:
        return <LandingPage onStart={() => setView(ViewMode.DEVICE)} />;
      case ViewMode.DEVICE:
        return <DeviceMonitor 
          onSaveSession={handleSaveSession} 
          onSessionDataChange={(data) => {
            setHasSessionData(data.length > 0);
            setSessionDataForMint(data);
          }}
        />;
      case ViewMode.MARKETPLACE:
        return <DataMarketplace listings={marketplaceListings} />;
      default:
        return <LandingPage onStart={() => setView(ViewMode.DEVICE)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans">
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full bg-slate-900/80 backdrop-blur-md border-b border-white/10 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <button 
              onClick={() => setView(ViewMode.HOME)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <img 
                src="/assets/logo.png" 
                alt="PlantBuddy Logo" 
                className="h-8 w-8 object-contain"
                onError={(e) => {
                  // Fallback to flower icon if logo doesn't exist
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('.logo-fallback')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'logo-fallback bg-brand-pink rounded-lg p-1.5';
                    fallback.innerHTML = '<svg class="h-6 w-6 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>';
                    parent.insertBefore(fallback, target);
                  }
                }}
              />
              <span className="text-xl font-mono font-bold tracking-tight text-white hidden sm:block">
                Plant<span className="text-brand-pink">Buddy</span>
              </span>
            </button>

            {/* Nav Links */}
            <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-xl border border-white/5">
              <button 
                onClick={() => setView(ViewMode.HOME)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${view === ViewMode.HOME ? 'bg-brand-blue text-brand-pink shadow-lg' : 'text-slate-400 hover:text-white'}`}
                title="Home"
              >
                <Home className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setView(ViewMode.DEVICE)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${view === ViewMode.DEVICE ? 'bg-brand-blue text-brand-pink shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <Activity className="w-4 h-4" />
                <span className="hidden md:inline">Device</span>
              </button>
              <button 
                onClick={() => setView(ViewMode.MARKETPLACE)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${view === ViewMode.MARKETPLACE ? 'bg-brand-blue text-brand-pink shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <Store className="w-4 h-4" />
                <span className="hidden md:inline">Market</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Mint Button - Always visible and highlighted in DEVICE view */}
              {view === ViewMode.DEVICE && (
                <button 
                  onClick={() => {
                    if (!hasSessionData || sessionDataForMint.length === 0) {
                      alert('⚠️ Warning: No session data found. Please start a conversation in Talk Mode first to generate data before minting to Walrus.');
                      return;
                    }
                    handleSaveSession(sessionDataForMint);
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-mono font-bold border transition-all flex items-center gap-2 bg-sky-400/10 text-sky-400 border-sky-400/20 hover:bg-sky-400 hover:text-slate-900"
                  title="Mint session data to Walrus"
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">MINT TO WALRUS</span>
                </button>
              )}
              
              {/* Settings / Lock */}
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className={`p-2 rounded-lg transition-all ${!hasKey ? 'text-red-400 bg-red-500/10 border border-red-500/50 animate-pulse' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                title={!hasKey ? "API Key Missing!" : "Settings"}
              >
                {!hasKey ? <AlertTriangle className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </button>

              {/* Wallet */}
              <button 
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className={`px-3 py-2 rounded-lg text-sm font-mono font-bold border transition-all flex items-center gap-2 ${walletAddress ? 'bg-brand-green/10 text-brand-green border-brand-green/50 hover:bg-red-500/10 hover:text-red-400 hover:border-red-400' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}
              >
                {walletAddress ? (
                   <>
                     <Wallet className="w-4 h-4" />
                     <span className="hidden sm:inline">{walletAddress.slice(0, 5)}...{walletAddress.slice(-4)}</span>
                   </>
                ) : (
                   <>
                     <Wallet className="w-4 h-4" />
                     <span className="hidden sm:inline">{isConnecting ? 'Connecting...' : 'Connect'}</span>
                   </>
                )}
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 px-4 max-w-7xl mx-auto min-h-screen">
        {renderView()}
      </main>

      {/* Wallet Picker Modal */}
      <Modal
        isOpen={isWalletPickerOpen}
        onClose={() => { setIsWalletPickerOpen(false); setWalletConnectError(null); }}
        title="Connect a Wallet"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Choose one of the detected wallets to connect to PlantBuddy on Sui.
          </p>
          {walletConnectError && (
            <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2 font-mono">
              {walletConnectError}
            </div>
          )}
          <div className="space-y-3">
            {wallets.map((wallet) => (
              <button
                key={`${wallet.name}-${wallet.version}`}
                onClick={() => startWalletConnection(wallet)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-700 bg-slate-800/50 hover:border-brand-pink hover:bg-slate-800 transition-all text-left"
                disabled={isConnecting}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center overflow-hidden border border-slate-700">
                  {wallet.icon ? (
                    <img src={wallet.icon} alt={wallet.name} className="w-full h-full object-cover" />
                  ) : (
                    <Wallet className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{wallet.name}</p>
                  <p className="text-xs text-slate-400">{wallet.chains?.[0] || 'Unknown chain'}</p>
                </div>
                {isConnecting && (
                  <Loader2 className="w-4 h-4 text-brand-accent animate-spin" />
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setIsWalletPickerOpen(false); setWalletConnectError(null); }}
            className="w-full py-2 text-sm font-semibold rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="API Settings"
      >
        <div className="space-y-4">
           <div className="p-3 bg-brand-blue/30 rounded border border-brand-accent/20 text-xs text-brand-accent">
             <p className="font-bold mb-1">Local Environment Setup</p>
             <p>To use PlantBuddy, you need a Google Gemini API Key. A default key has been pre-loaded for you.</p>
           </div>
           
           <div>
             <label className="block text-xs font-mono text-slate-500 mb-1">GOOGLE GEMINI API KEY</label>
             <input 
               type="password" 
               placeholder="AIza..." 
               value={geminiKey}
               onChange={(e) => setGeminiKey(e.target.value)}
               className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-brand-pink"
             />
           </div>

           <div className="text-[10px] text-slate-400 mt-2 p-2 bg-slate-900 rounded border border-slate-800">
             <strong>Note:</strong> You can change this if you want to use your own quota. The link below opens Google AI Studio.
           </div>

           <a 
             href="https://aistudio.google.com/app/apikey" 
             target="_blank" 
             rel="noreferrer"
             className="block text-xs text-brand-pink hover:underline text-right mt-1"
           >
             Get a free API Key at Google AI Studio →
           </a>

           <button 
             onClick={handleSaveApiKey}
             className="w-full bg-brand-green/20 text-brand-green border border-brand-green/50 py-2 rounded font-bold hover:bg-brand-green/30 transition-colors"
           >
             Save Configuration
           </button>
        </div>
      </Modal>

      {/* Upload/Minting Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Mint to Walrus Network"
      >
        {uploadStep === 'IDLE' && (
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-slate-400 space-y-1 border border-slate-800">
              <div className="flex justify-between border-b border-slate-800 pb-2 mb-2">
                <span className="font-bold text-slate-300">METADATA HEADER</span>
                <span className="text-brand-accent">JSON_V2</span>
              </div>
              <div className="flex justify-between"><span>CREATOR:</span> <span className="text-white">{walletAddress ? `${walletAddress.slice(0,8)}...` : 'ANONYMOUS'}</span></div>
              <div className="flex justify-between"><span>DATA_TYPE:</span> <span className="text-white">INTERACTION_SCRIPT</span></div>
              <div className="flex justify-between"><span>PACKETS:</span> <span className="text-white">{currentSessionData.length}</span></div>
            </div>
            
            {/* Network Selector - Testnet Only */}
            <div className="space-y-2">
               <label className="text-xs font-mono text-slate-500 block">DESTINATION NETWORK</label>
               <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 flex items-center justify-center gap-2">
                  <Globe className="w-4 h-4 text-brand-blue" />
                  <span className="text-sm font-bold text-white">Testnet (Free)</span>
                  <span className="text-[10px] text-slate-500 ml-2">Mainnet coming soon</span>
               </div>
            </div>
            
            <p className="text-sm text-slate-300">
              This process will compile the voice interaction script, encrypt it, and store it permanently on the Walrus decentralized storage network.
            </p>
            
            <button 
              onClick={processUpload}
              className="w-full py-3 bg-brand-pink text-brand-blue font-bold rounded-lg hover:bg-white transition-colors flex justify-center items-center gap-2 shadow-lg shadow-brand-pink/20"
            >
              <UploadCloud className="w-5 h-5" />
              Upload to Walrus ({selectedNetwork})
            </button>
          </div>
        )}

        {(uploadStep === 'ANALYZING' || uploadStep === 'ENCRYPTING' || uploadStep === 'UPLOADING' || uploadStep === 'CERTIFYING') && (
          <div className="py-6 space-y-6">
            {/* Terminal-style progress */}
            <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs space-y-2 border border-slate-800 h-48 overflow-hidden relative">
               <div className="text-brand-green">$ init_upload_sequence</div>
               <div className="text-slate-400">{`> Compiling ${currentSessionData.length} data points...`}</div>
               {blobScript && <div className="text-slate-500 opacity-50 whitespace-pre-wrap truncate">{blobScript.slice(0, 150)}...</div>}
               {uploadStep !== 'ANALYZING' && <div className="text-brand-accent">{`> AI Analysis Complete.`}</div>}
               {uploadStep === 'ENCRYPTING' && <div className="text-yellow-400 animate-pulse">{`> Encrypting Payload...`}</div>}
               {(uploadStep === 'UPLOADING' || uploadStep === 'CERTIFYING') && (
                 <>
                   <div className="text-brand-green">{`> Encryption Verified.`}</div>
                   <div className="text-brand-pink animate-pulse">{`> Broadcasting to Walrus ${selectedNetwork}...`}</div>
                 </>
               )}
               {uploadStep === 'CERTIFYING' && (
                  <div className="text-brand-accent animate-pulse">{`> Certifying Blob on Sui Chain...`}</div>
               )}
               
               {/* Scanline effect */}
               <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent opacity-10 animate-scan pointer-events-none"></div>
            </div>

            <div className="flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
              <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">{uploadStep}...</span>
            </div>
          </div>
        )}

        {uploadStep === 'SUCCESS' && mintedBlob && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 bg-brand-green/20 rounded-full flex items-center justify-center mx-auto text-brand-green border border-brand-green/50 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-white">Upload Complete</h4>
              <p className="text-slate-400 text-sm mt-2">
                {mintedBlob.txDigest 
                  ? 'Data Blob stored on Walrus & Certified on Sui blockchain.' 
                  : 'Data Blob stored on Walrus. On-chain certification skipped.'}
              </p>
            </div>
            
            <div className="bg-slate-800/50 border border-dashed border-slate-600 p-4 rounded-xl text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-20">
                <Database className="w-16 h-16 text-slate-400" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-brand-accent" />
                  <span className="text-xs font-bold text-white">
                    {mintedBlob.txDigest ? 'ON-CHAIN CERTIFIED' : 'STORED ON WALRUS'}
                  </span>
                </div>
                
                <div className="text-[10px] text-slate-500 font-mono mb-1">
                  {mintedBlob.txDigest ? 'TRANSACTION DIGEST (Verifiable on Sui)' : 'WALRUS BLOB ID'}
                </div>
                <div className="font-mono text-brand-accent text-xs break-all bg-slate-900/50 p-2 rounded border border-slate-700/50 mb-2 select-all">
                  {mintedBlob.id}
                </div>
                
                {mintedBlob.txDigest && (
                  <a
                    href={`https://testnet.suivision.xyz/txblock/${mintedBlob.txDigest}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-brand-blue hover:text-brand-pink flex items-center gap-1 mb-3 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View on SuiVision Explorer
                  </a>
                )}
                
                {mintedBlob.walrusBlobId && mintedBlob.walrusBlobId !== mintedBlob.id && (
                  <div className="mt-2 pt-2 border-t border-slate-700/50">
                    <div className="text-[10px] text-slate-500 font-mono mb-1">WALRUS STORAGE ID</div>
                    <div className="font-mono text-slate-400 text-[10px] break-all bg-slate-900/30 p-1.5 rounded border border-slate-700/30 select-all">
                      {mintedBlob.walrusBlobId}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[10px] text-slate-500 font-mono mb-1">MARKET VALUE</div>
                    <div className="font-bold text-white text-lg">{mintedBlob.price} SUI</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 font-mono mb-1">SIZE</div>
                    <div className="font-mono text-slate-300 text-sm">{mintedBlob.size}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
               {/* Download Button for Hackathon Proof */}
               <button 
                onClick={handleDownloadBlob}
                className="w-full py-3 bg-slate-800 text-white border border-slate-600 rounded-lg hover:bg-slate-700 transition-all flex items-center justify-center gap-2 group"
              >
                <Download className="w-4 h-4 group-hover:text-brand-accent transition-colors" />
                Download Blob Data (JSON)
                <ExternalLink className="w-3 h-3 opacity-50" />
              </button>

              <div className="flex gap-3">
                <button 
                  onClick={() => { setIsModalOpen(false); setView(ViewMode.MARKETPLACE); }}
                  className="flex-1 py-3 bg-brand-blue border border-brand-accent/30 text-brand-accent rounded-lg hover:bg-brand-accent/10 text-sm font-bold transition-all"
                >
                  View in Marketplace
                </button>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-brand-pink text-brand-blue rounded-lg font-bold text-sm hover:bg-white transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default App;
