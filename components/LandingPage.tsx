
import React from 'react';
import { 
  Leaf, Heart, Shield, Database, Music, Mic, 
  Cpu, Lock, Globe, ArrowRight, Zap, Cloud
} from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="space-y-24 pb-16">
      
      {/* HERO SECTION */}
      <div className="relative isolate pt-14">
        {/* Background Gradient Blob */}
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-brand-pink to-brand-green opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
        </div>
        
        <div className="mx-auto max-w-4xl py-12 text-center">
          
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl font-mono">
            Plant<span className="text-brand-pink">Buddy</span>
          </h1>
          <p className="mt-6 text-2xl font-semibold text-brand-green">
            Where Nature Meets AI to Create Safe Spaces for the Human Heart
          </p>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            A gentle, private, and empathetic plant companion. Experience nature × AI × Decentralized Emotional Sharing.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <button
              onClick={onStart}
              className="rounded-xl bg-brand-pink px-8 py-4 text-base font-bold text-slate-900 shadow-lg shadow-brand-pink/20 hover:bg-white hover:scale-105 transition-all flex items-center gap-2 group"
            >
              <Music className="w-5 h-5 group-hover:animate-bounce" />
              Connect With Your PlantBuddy
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* THE PROBLEM & INSIGHT */}
      <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto px-6">
        <div className="bg-slate-900/50 p-8 rounded-3xl border border-white/5 hover:border-red-400/30 transition-colors">
          <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-6">
            <Heart className="w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">The Problem</h2>
          <ul className="space-y-3 text-slate-400">
            <li className="flex gap-2"><span className="text-red-400">💔</span> Emotional loneliness is rising; people lack safe outlets for vulnerable sharing.</li>
            <li className="flex gap-2"><span className="text-red-400">🔓</span> Existing apps centralize and monetize intimate data.</li>
            <li className="flex gap-2"><span className="text-red-400">❌</span> Fear of judgment prevents honest expression.</li>
          </ul>
        </div>

        <div className="bg-slate-900/50 p-8 rounded-3xl border border-white/5 hover:border-brand-green/30 transition-colors">
          <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center mb-6">
            <Leaf className="w-6 h-6 text-brand-green" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Our Insight</h2>
          <ul className="space-y-3 text-slate-400">
            <li className="flex gap-2"><span className="text-brand-green">🌿</span> Plants feel safe: non-judgmental, calming, and alive.</li>
            <li className="flex gap-2"><span className="text-brand-green">✨</span> The ritual of touch grounds the experience and reduces anxiety.</li>
            <li className="flex gap-2"><span className="text-brand-green">🗣️</span> Screen-free voice interactions feel more human and soothing.</li>
          </ul>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-slate-400">From touch to decentralized storage</p>
        </div>

        <div className="relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-brand-pink/20 via-brand-accent/20 to-brand-green/20 -translate-y-1/2 z-0"></div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
            {[
              { icon: Zap, title: "Touch Plant", desc: "Arduino senses micro-variations in capacitance.", color: "text-yellow-400", bg: "bg-yellow-400/10" },
              { icon: Mic, title: "Speak or Play", desc: "AI listens and generates a gentle, empathetic reply.", color: "text-brand-pink", bg: "bg-brand-pink/10" },
              { icon: Lock, title: "Encrypt", desc: "Data is encrypted locally (AES-256) before leaving device.", color: "text-brand-accent", bg: "bg-brand-accent/10" },
              { icon: Database, title: "Store on Walrus", desc: "Permanent, user-owned storage on decentralized blobs.", color: "text-brand-green", bg: "bg-brand-green/10" },
            ].map((step, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col items-center text-center hover:-translate-y-2 transition-transform shadow-xl">
                <div className={`w-16 h-16 ${step.bg} rounded-full flex items-center justify-center mb-4`}>
                  <step.icon className={`w-8 h-8 ${step.color}`} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WHY WALRUS */}
      <div className="bg-slate-800/30 py-20">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-white mb-6">Why Walrus Network?</h2>
            <div className="space-y-6">
               <div className="flex gap-4">
                 <div className="mt-1 bg-red-500/10 p-2 rounded h-fit"><Cloud className="w-5 h-5 text-red-400"/></div>
                 <div>
                   <h4 className="text-white font-bold">Traditional Cloud</h4>
                   <p className="text-slate-400 text-sm">Readable by provider, accounts required, single point of failure, revocable storage.</p>
                 </div>
               </div>
               <div className="flex gap-4">
                 <div className="mt-1 bg-brand-green/10 p-2 rounded h-fit"><Shield className="w-5 h-5 text-brand-green"/></div>
                 <div>
                   <h4 className="text-white font-bold">Walrus + PlantBuddy</h4>
                   <p className="text-slate-400 text-sm">Zero-knowledge, decentralized, user-owned, permanent blobs. Perfect for private emotional data.</p>
                 </div>
               </div>
            </div>
            <div className="mt-8 pt-8 border-t border-white/10">
               <h3 className="text-xl font-bold text-white mb-2">Data Marketplace</h3>
               <p className="text-slate-400 text-sm mb-4">
                 Optional: "Connect With Others" to share anonymized stories. 
                 Monetize your emotional datasets (150-500 SUI) with provable ownership.
               </p>
               <div className="flex gap-2">
                 <span className="px-3 py-1 bg-slate-700 rounded-full text-xs text-white">Encrypted</span>
                 <span className="px-3 py-1 bg-slate-700 rounded-full text-xs text-white">User-Owned</span>
                 <span className="px-3 py-1 bg-slate-700 rounded-full text-xs text-white">SUI Integrated</span>
               </div>
            </div>
          </div>
          
          <div className="relative">
             <div className="absolute inset-0 bg-brand-accent/20 blur-3xl rounded-full"></div>
             <div className="relative bg-slate-900 border border-slate-700 p-8 rounded-3xl">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-brand-pink font-mono">PRIVACY-FIRST ARCHITECTURE</span>
                  <Lock className="text-brand-accent w-5 h-5" />
                </div>
                <div className="space-y-4 font-mono text-sm">
                  <div className="flex items-center gap-4">
                     <div className="w-8 h-8 bg-slate-700 rounded flex items-center justify-center">APP</div>
                     <ArrowRight className="text-slate-600" />
                     <div className="w-8 h-8 bg-yellow-500/20 text-yellow-500 rounded flex items-center justify-center"><Cpu className="w-4 h-4"/></div>
                     <ArrowRight className="text-slate-600" />
                     <div className="px-3 py-1 bg-brand-green/20 text-brand-green rounded border border-brand-green/50">WALRUS BLOB</div>
                  </div>
                  <div className="p-4 bg-slate-950 rounded border border-slate-800 text-slate-400">
                    <p className="mb-2 text-white">Zero-Knowledge Storage</p>
                    <p>AES-256-GCM encryption happens on the Edge (Client Device). Only the user holds the key.</p>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="text-center pt-8 border-t border-white/5">
        <h2 className="text-2xl font-bold text-brand-pink mb-2">Let's grow connection together 🌱</h2>
        <p className="text-slate-500 mb-8">PlantBuddy — Built with privacy-by-design</p>
        <button
          onClick={onStart}
          className="text-white hover:text-brand-accent underline underline-offset-4 transition-colors"
        >
          Enter App Interface
        </button>
      </div>

    </div>
  );
};

export default LandingPage;
