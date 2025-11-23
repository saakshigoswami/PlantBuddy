
import React, { useState } from 'react';
import { ViewMode, PlantDataPoint, MOCK_BLOBS, DataBlob } from './types';
import { analyzeDatasetValue } from './services/geminiService'; // Switched back to Gemini
import DeviceMonitor from './components/DeviceMonitor';
import DataMarketplace from './components/DataMarketplace';
import Modal from './components/Modal';
import { Flower, Store, Wallet, Loader2, CheckCircle, UploadCloud, FileText, Database, Activity, Download, ExternalLink } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.DEVICE);
  const [walletConnected, setWalletConnected] = useState(false);
  const [marketplaceListings, setMarketplaceListings] = useState<DataBlob[]>(MOCK_BLOBS);
  
  // Upload/Mint State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState<'IDLE' | 'ANALYZING' | 'ENCRYPTING' | 'UPLOADING' | 'SUCCESS'>('IDLE');
  const [currentSessionData, setCurrentSessionData] = useState<PlantDataPoint[]>([]);
  const [mintedBlob, setMintedBlob] = useState<DataBlob | null>(null);
  const [blobScript, setBlobScript] = useState<string>("");

  const handleSaveSession = (data: PlantDataPoint[]) => {
    setCurrentSessionData(data);
    setIsModalOpen(true);
    setUploadStep('IDLE');
    setMintedBlob(null);
    setBlobScript("");
  };

  const processUpload = async () => {
    try {
      setUploadStep('ANALYZING');
      
      // 1. Generate the Script (The "Payload" for Walrus)
      const scriptHeader = `FLORA-FI SESSION TRANSCRIPT\nDATE: ${new Date().toISOString()}\nDEVICE_ID: ESP32_B7\n-----------------------------------\n\n`;
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
      await new Promise(resolve => setTimeout(resolve, 1000)); // Fake delay

      setUploadStep('UPLOADING');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Fake Walrus upload delay

      // 3. Create Blob Object
      const newBlob: DataBlob = {
        id: `blob_${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
        name: analysis.title,
        description: analysis.description,
        size: `${(fullScript.length / 1024).toFixed(2)} KB`,
        price: analysis.priceSuggestion,
        creator: walletConnected ? '0x82...F9' : '0xME...YOU',
        timestamp: new Date().toISOString(),
        dataPoints: currentSessionData.length,
        sentimentScore: Math.floor(Math.random() * 100),
        status: 'LISTED',
        owner: walletConnected ? '0x82...F9' : '0xME...YOU'
      };

      setMintedBlob(newBlob);
      setMarketplaceListings(prev => [newBlob, ...prev]);
      setUploadStep('SUCCESS');
    } catch (error) {
      console.error("Upload failed", error);
      setUploadStep('IDLE');
      alert("Failed to process upload. Gemini API Error.");
    }
  };

  const handleDownloadBlob = () => {
    if (!blobScript || !mintedBlob) return;
    
    const element = document.createElement("a");
    const file = new Blob([blobScript], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `FloraFi_${mintedBlob.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans">
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full bg-slate-900/80 backdrop-blur-md border-b border-white/10 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="bg-brand-pink rounded-lg p-1.5">
                <Flower className="h-6 w-6 text-brand-blue" />
              </div>
              <span className="text-xl font-mono font-bold tracking-tight text-white">
                Flora<span className="text-brand-pink">Fi</span>
              </span>
            </div>

            {/* Nav Links */}
            <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-xl border border-white/5">
              <button 
                onClick={() => setView(ViewMode.DEVICE)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${view === ViewMode.DEVICE ? 'bg-brand-blue text-brand-pink shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">Device Interface</span>
              </button>
              <button 
                onClick={() => setView(ViewMode.MARKETPLACE)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${view === ViewMode.MARKETPLACE ? 'bg-brand-blue text-brand-pink shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <Store className="w-4 h-4" />
                <span className="hidden sm:inline">Data Market</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Wallet */}
              <button 
                onClick={() => setWalletConnected(!walletConnected)}
                className={`px-4 py-2 rounded-lg text-sm font-mono font-bold border transition-all flex items-center gap-2 ${walletConnected ? 'bg-brand-green/10 text-brand-green border-brand-green/50' : 'bg-slate-800 border-slate-700 hover:border-slate-500'}`}
              >
                <Wallet className="w-4 h-4" />
                {walletConnected ? '0x82...F9' : 'Connect Wallet'}
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4 max-w-7xl mx-auto min-h-screen">
        {view === ViewMode.DEVICE ? (
          <DeviceMonitor onSaveSession={handleSaveSession} />
        ) : (
          <DataMarketplace listings={marketplaceListings} />
        )}
      </main>

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
              <div className="flex justify-between"><span>DATA_TYPE:</span> <span className="text-white">INTERACTION_SCRIPT</span></div>
              <div className="flex justify-between"><span>PACKETS:</span> <span className="text-white">{currentSessionData.length}</span></div>
              <div className="flex justify-between"><span>ENCRYPTION:</span> <span className="text-white">AES-256 (Pending)</span></div>
            </div>
            
            <p className="text-sm text-slate-300">
              This process will compile the voice interaction script, encrypt it, and store it permanently on the Walrus decentralized storage network.
            </p>
            
            <button 
              onClick={processUpload}
              className="w-full py-3 bg-brand-pink text-brand-blue font-bold rounded-lg hover:bg-white transition-colors flex justify-center items-center gap-2 shadow-lg shadow-brand-pink/20"
            >
              <UploadCloud className="w-5 h-5" />
              Generate & Upload Script
            </button>
          </div>
        )}

        {(uploadStep === 'ANALYZING' || uploadStep === 'ENCRYPTING' || uploadStep === 'UPLOADING') && (
          <div className="py-6 space-y-6">
            {/* Terminal-style progress */}
            <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs space-y-2 border border-slate-800 h-48 overflow-hidden relative">
               <div className="text-brand-green">$ init_upload_sequence</div>
               <div className="text-slate-400">{`> Compiling ${currentSessionData.length} data points...`}</div>
               {blobScript && <div className="text-slate-500 opacity-50 whitespace-pre-wrap truncate">{blobScript.slice(0, 150)}...</div>}
               {uploadStep !== 'ANALYZING' && <div className="text-brand-accent">{`> AI Analysis Complete.`}</div>}
               {uploadStep === 'ENCRYPTING' && <div className="text-yellow-400 animate-pulse">{`> Encrypting Payload...`}</div>}
               {uploadStep === 'UPLOADING' && (
                 <>
                   <div className="text-brand-green">{`> Encryption Verified.`}</div>
                   <div className="text-brand-pink animate-pulse">{`> Broadcasting to Walrus Nodes...`}</div>
                 </>
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
              <p className="text-slate-400 text-sm mt-2">Data Blob stored on Walrus & Token Minted.</p>
            </div>
            
            <div className="bg-slate-800/50 border border-dashed border-slate-600 p-4 rounded-xl text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-20">
                <Database className="w-16 h-16 text-slate-400" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-brand-accent" />
                  <span className="text-xs font-bold text-white">SCRIPT PAYLOAD STORED</span>
                </div>
                
                <div className="text-[10px] text-slate-500 font-mono mb-1">WALRUS BLOB ID (SIMULATED)</div>
                <div className="font-mono text-brand-accent text-xs break-all bg-slate-900/50 p-2 rounded border border-slate-700/50 mb-3">
                  {mintedBlob.id}
                </div>
                
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
