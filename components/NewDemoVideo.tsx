import React from 'react';

const NewDemoVideo: React.FC = () => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/50">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-white">
            See PlantBuddy in Action
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Watch how PlantBuddy combines AI, nature, and technology to create a unique emotional companion experience.
          </p>
        </div>
        
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl animate-scale-in hover:scale-105 transition-transform duration-500 hover:shadow-[0_0_40px_rgba(255,107,157,0.3)]">
          <iframe
            className="absolute inset-0 w-full h-full"
            src="https://www.youtube.com/embed/czKneFSUZII"
            title="PlantBuddy Demo Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </section>
  );
};

export default NewDemoVideo;

