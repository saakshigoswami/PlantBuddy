
import React from 'react';
import { DataBlob } from '../types';
import { Database, ShieldCheck, Coins, Search } from 'lucide-react';

interface DataMarketplaceProps {
  listings: DataBlob[];
}

const DataMarketplace: React.FC<DataMarketplaceProps> = ({ listings }) => {
  return (
    <div className="space-y-8">
      
      {/* Header Section */}
      <div className="text-center space-y-4 py-8 bg-gradient-to-r from-brand-pink/10 via-transparent to-brand-accent/10 rounded-3xl border border-white/5">
        <h1 className="text-4xl md:text-6xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-pink to-brand-accent">
          PLANTBUDDY MARKET
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Decentralized exchange for bio-interactive datasets. 
          Provable ownership via Walrus Blobs. 
          Monetize emotional resonance.
        </p>
        <div className="flex justify-center gap-8 mt-4 font-mono text-sm text-brand-green">
          <div className="flex items-center gap-2">
             <Database className="w-4 h-4" />
             <span>TOTAL VOL: 452k SUI</span>
          </div>
          <div className="flex items-center gap-2">
             <ShieldCheck className="w-4 h-4" />
             <span>VERIFIED BLOBS: 12,405</span>
          </div>
        </div>
      </div>

      {/* Search / Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search by Blob ID, Plant Type, or Sentiment..." 
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-brand-pink text-sm text-white"
          />
        </div>
        <select className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-300 focus:outline-none">
          <option>Sort by: Newest</option>
          <option>Price: High to Low</option>
          <option>Sentiment: High to Low</option>
        </select>
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map((blob) => (
          <div key={blob.id} className="group relative bg-slate-900 border border-slate-800 hover:border-brand-pink/50 transition-all duration-300 rounded-2xl overflow-hidden flex flex-col">
            
            {/* Card Header Gradient */}
            <div className="h-2 w-full bg-gradient-to-r from-brand-pink to-purple-500" />
            
            <div className="p-6 flex-1 flex flex-col">
              {/* Blob ID Pill */}
              <div className="flex justify-between items-start mb-4">
                 <span className="px-2 py-1 bg-slate-800 text-xs font-mono text-slate-400 rounded border border-slate-700 truncate max-w-[120px]">
                   {blob.id}
                 </span>
                 <span className={`text-xs px-2 py-1 rounded font-bold ${blob.status === 'SOLD' ? 'bg-red-500/20 text-red-400' : 'bg-brand-green/20 text-brand-green'}`}>
                   {blob.status}
                 </span>
              </div>

              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-brand-pink transition-colors">
                {blob.name}
              </h3>
              <p className="text-slate-400 text-sm mb-6 flex-1 leading-relaxed">
                {blob.description}
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-500 mb-6 bg-slate-950/50 p-3 rounded-lg">
                <div>SIZE: <span className="text-slate-300">{blob.size}</span></div>
                <div>PTS: <span className="text-slate-300">{blob.dataPoints}</span></div>
                <div className="col-span-2 flex items-center gap-2">
                   SENTIMENT: 
                   <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                     <div 
                       className="h-full bg-brand-accent" 
                       style={{ width: `${blob.sentimentScore}%` }} 
                     />
                   </div>
                </div>
              </div>

              {/* Price / Action */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-bold text-lg">
                  <Coins className="w-5 h-5 text-yellow-400" />
                  {blob.price} SUI
                </div>
                <button 
                  disabled={blob.status === 'SOLD'}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${blob.status === 'SOLD' ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-brand-pink text-brand-blue hover:bg-white'}`}
                >
                  {blob.status === 'SOLD' ? 'Sold Out' : 'Buy Dataset'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DataMarketplace;
