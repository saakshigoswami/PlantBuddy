
import React from 'react';
import NewHero from './NewHero';
import NewProblemInsight from './NewProblemInsight';
import NewDemoVideo from './NewDemoVideo';
import NewHowItWorks from './NewHowItWorks';
import NewWhyWalrus from './NewWhyWalrus';
import NewFooter from './NewFooter';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      
      <NewHero onStart={onStart} />
      <NewProblemInsight />
      <NewDemoVideo />
      <NewHowItWorks />
      <NewWhyWalrus />
      <NewFooter onStart={onStart} />

    </div>
  );
};

export default LandingPage;
