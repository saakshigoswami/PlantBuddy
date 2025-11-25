import React from 'react';
import { Heart, Lock, X, Leaf, Sparkles, Mic } from 'lucide-react';

const NewProblemInsight: React.FC = () => {
  const problems = [
    {
      icon: Heart,
      text: "Emotional loneliness is rising; people lack safe outlets for vulnerable sharing.",
    },
    {
      icon: Lock,
      text: "Existing apps centralize and monetize intimate data.",
    },
    {
      icon: X,
      text: "Fear of judgment prevents honest expression.",
    },
  ];

  const insights = [
    {
      icon: Leaf,
      text: "Plants feel safe: non-judgmental, calming, and alive.",
    },
    {
      icon: Sparkles,
      text: "The ritual of touch grounds the experience and reduces anxiety.",
    },
    {
      icon: Mic,
      text: "Screen-free voice interactions feel more human and soothing.",
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0f172a] to-slate-800/30">
      <div className="container mx-auto max-w-7xl">
        <div className="grid md:grid-cols-2 gap-12">
          {/* The Problem */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4 animate-gentle-bounce">
                <Heart className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">The Problem</h2>
            </div>
            <div className="space-y-4">
              {problems.map((problem, index) => {
                const Icon = problem.icon;
                return (
                  <div 
                    key={index} 
                    className="p-6 bg-slate-900/50 border border-slate-700/50 rounded-xl hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-105"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <Icon className="w-6 h-6 text-red-400 hover:animate-gentle-bounce transition-all duration-300" />
                      </div>
                      <p className="text-slate-300 leading-relaxed">{problem.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Our Insight */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-green/10 mb-4 animate-gentle-bounce" style={{ animationDelay: '0.1s' }}>
                <Leaf className="w-8 h-8 text-brand-green" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">Our Insight</h2>
            </div>
            <div className="space-y-4">
              {insights.map((insight, index) => {
                const Icon = insight.icon;
                return (
                  <div 
                    key={index} 
                    className="p-6 bg-slate-900/50 border border-slate-700/50 rounded-xl hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-105"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <Icon className="w-6 h-6 text-brand-green hover:animate-gentle-bounce transition-all duration-300" />
                      </div>
                      <p className="text-slate-300 leading-relaxed">{insight.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewProblemInsight;

