import React from 'react';
import { Hand, MessageSquare, Shield, Database } from 'lucide-react';

const NewHowItWorks: React.FC = () => {
  const steps = [
    {
      icon: Hand,
      title: "Touch Plant",
      description: "Arduino senses micro-variations in capacitance.",
      image: "/assets/touch-plant.jpg",
    },
    {
      icon: MessageSquare,
      title: "Speak or Play",
      description: "AI listens and generates a gentle, empathetic reply.",
      gradient: true,
    },
    {
      icon: Shield,
      title: "Encrypt",
      description: "Data is encrypted locally (AES-256) before leaving device.",
      image: "/assets/encryption.jpg",
    },
    {
      icon: Database,
      title: "Store on Walrus",
      description: "Permanent, user-owned storage on decentralized blobs.",
      gradient: true,
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0f172a]">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-white">How It Works</h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            From touch to decentralized storage
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div 
                key={index}
                className="group relative overflow-hidden border border-slate-700/50 rounded-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-slate-900/50"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Background */}
                {step.image && (
                  <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-500">
                    <img 
                      src={step.image} 
                      alt={step.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                {step.gradient && (
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-green/10 to-brand-pink/10 opacity-10 group-hover:opacity-20 transition-opacity duration-500"></div>
                )}

                {/* Content */}
                <div className="relative p-8 flex flex-col items-center text-center h-full">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-brand-green/10 mb-6 group-hover:bg-brand-green/20 transition-colors duration-300 group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-8 h-8 text-brand-green group-hover:animate-gentle-bounce" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">{step.title}</h3>
                  <p className="text-slate-300 leading-relaxed">{step.description}</p>
                </div>

                {/* Step Number */}
                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#ff6b9d]/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-[#ff6b9d]">{index + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default NewHowItWorks;

