import React from 'react';
import { Leaf } from 'lucide-react';

interface NewFooterProps {
  onStart: () => void;
}

const NewFooter: React.FC<NewFooterProps> = ({ onStart }) => {
  return (
    <footer className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0f172a] to-slate-800/50">
      <div className="container mx-auto max-w-4xl text-center">
        <div className="mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-green/10 mb-6 animate-gentle-bounce">
            <Leaf className="w-8 h-8 text-brand-green animate-gentle-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
            Let's grow connection together 🌱
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            PlantBuddy — Built with privacy-by-design
          </p>
          <button
            onClick={onStart}
            className="bg-brand-green hover:bg-brand-green/90 text-white shadow-lg text-lg px-8 py-6 rounded-full transition-all duration-300 hover:scale-110 hover:shadow-xl animate-pulse-glow"
          >
            Enter App Interface
          </button>
        </div>

        <div className="pt-8 border-t border-slate-700/50 text-sm text-slate-400">
          <p>© 2025 PlantBuddy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default NewFooter;

