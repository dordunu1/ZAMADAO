import React from 'react';
import { Shield, Lock, Users, ArrowRight, Sparkles } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-zama-light-orange/30 via-white to-primary/10 dark:from-zama-dark/80 dark:via-card-dark dark:to-primary/20 transition-all duration-300 p-4">
      <div className="max-w-2xl w-full bg-white/90 dark:bg-card-dark/90 rounded-3xl shadow-zama-lg border border-zama-light-orange dark:border-border-dark p-8 flex flex-col items-center animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="text-primary" size={36} />
          <h1 className="text-3xl sm:text-4xl font-extrabold text-accent dark:text-text-primary-dark tracking-tight">Confidential DAO</h1>
        </div>
        <p className="text-lg sm:text-xl text-text-secondary dark:text-text-secondary-dark mb-6 text-center font-medium">
          Private, Verifiable, and Secure On-Chain Governance powered by <span className="text-primary font-bold">ZAMA FHE</span>
        </p>

        <div className="space-y-6 w-full mb-8">
          <div className="flex items-start gap-4">
            <Lock className="text-primary flex-shrink-0 mt-1.5" size={28} />
            <div>
              <h2 className="text-xl font-semibold text-accent dark:text-text-primary-dark mb-1 flex items-center gap-2">
                Why Privacy Matters for DAOs <Sparkles className="text-yellow-400" size={18} />
              </h2>
              <p className="text-text-secondary dark:text-text-secondary-dark">
                In traditional DAOs, every vote is public. This can lead to social pressure, vote buying, and loss of true governance freedom. Our platform ensures your vote is <span className="font-bold text-primary">fully confidential</span> until the results are revealed.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Shield className="text-primary flex-shrink-0 mt-1.5" size={28} />
            <div>
              <h2 className="text-xl font-semibold text-accent dark:text-text-primary-dark mb-1 flex items-center gap-2">
                What is ZAMA FHE?
              </h2>
              <p className="text-text-secondary dark:text-text-secondary-dark">
                <span className="font-bold">Fully Homomorphic Encryption (FHE)</span> by ZAMA allows computations on encrypted data directly on-chain. With ZAMA FHE, your votes are encrypted end-to-end, and only decrypted after the voting period, ensuring <span className="font-bold text-primary">true privacy</span> and <span className="font-bold text-primary">verifiable results</span>.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <Users className="text-primary flex-shrink-0 mt-1.5" size={28} />
            <div>
              <h2 className="text-xl font-semibold text-accent dark:text-text-primary-dark mb-1 flex items-center gap-2">
                Why We Chose ZAMA
              </h2>
              <p className="text-text-secondary dark:text-text-secondary-dark">
                We believe privacy is a fundamental right. ZAMA's FHEVM is the only technology that enables <span className="font-bold text-primary">confidential, on-chain governance</span> without sacrificing transparency or security. No more vote buying, no more social pressure—just honest, private governance.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onEnter}
          className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-bold text-lg shadow-zama hover:bg-primary/90 transition-all duration-300 transform hover:scale-105"
        >
          Enter DAO <ArrowRight size={22} />
        </button>
      </div>
      <div className="mt-8 text-center text-xs text-text-secondary dark:text-text-secondary-dark">
        Powered by <a href="https://zama.ai" target="_blank" rel="noopener noreferrer" className="underline text-primary font-semibold">ZAMA FHE</a> &middot; <a href="https://docs.zama.ai" target="_blank" rel="noopener noreferrer" className="underline text-primary font-semibold">Learn More</a>
      </div>
    </div>
  );
};

export default LandingPage; 