import React from 'react';
import { Music } from 'lucide-react';

interface NewHeroProps {
  onStart: () => void;
}

const NewHero: React.FC<NewHeroProps> = ({ onStart }) => {
  return (
    <section className="relative bg-[#2d5f4f] py-12">
      {/* Logo and Title */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="flex items-center justify-center gap-3 mb-12 animate-fade-in">
          <img 
            src="/assets/logo.png" 
            alt="PlantBuddy Logo" 
            className="w-16 h-16 object-contain"
            onError={(e) => {
              // Fallback to tech image if logo doesn't exist
              (e.target as HTMLImageElement).src = '/assets/plant-buddy-tech.png';
            }}
          />
          <h1 className="text-4xl sm:text-5xl font-bold text-white">
            Plant<span className="text-[#ff6b9d]">Buddy</span>
          </h1>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8 items-center max-w-7xl mx-auto">
          {/* Left Image */}
          <div className="flex justify-center animate-scale-in">
            <img 
              src="/assets/plant-buddy-tech.png" 
              alt="PlantBuddy IoT device - cute kawaii plant pot" 
              className="w-full max-w-xs rounded-2xl shadow-2xl"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>

          {/* Center Content */}
          <div className="text-center animate-fade-in-up">
            <p className="text-white/90 text-base sm:text-lg mb-6 leading-relaxed">
              An IoT device that wraps around your plant and you can talk to your plant or play it like a piano.
            </p>
            <p className="text-white/80 text-sm mb-4">
              A gentle, private, and empathetic plant companion.
            </p>
            <p className="text-white/70 text-sm mb-8">
              Experience nature × AI × Decentralized Emotional Sharing.
            </p>
            <button
              onClick={onStart}
              className="bg-[#ff6b9d] hover:bg-[#ff6b9d]/90 text-white shadow-2xl text-base px-8 py-6 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-xl flex items-center gap-2 mx-auto"
            >
              <Music className="w-5 h-5" />
              Connect With Your PlantBuddy
            </button>
          </div>

          {/* Right Image */}
          <div className="flex justify-center animate-scale-in">
            <img 
              src="/assets/hero-plant.jpg" 
              alt="Person interacting with PlantBuddy" 
              className="w-full max-w-xs rounded-2xl shadow-2xl"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewHero;

