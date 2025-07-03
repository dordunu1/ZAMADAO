import React, { useState } from 'react';
import { X, ThumbsUp, ThumbsDown, MinusCircle, Shield, Vote, AlertCircle } from 'lucide-react';
import { VoteType } from '../types/proposal';

interface ConfidentialVoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVote: (voteType: number, setVoteStep: React.Dispatch<React.SetStateAction<'idle' | 'encrypting' | 'casting'>>) => Promise<void>;
  proposalId: string;
  proposalTitle: string;
  votingPower: number | null;
}

const ConfidentialVoteModal: React.FC<ConfidentialVoteModalProps> = ({
  isOpen,
  onClose,
  onVote,
  proposalId,
  proposalTitle,
  votingPower
}) => {
  const [selectedVote, setSelectedVote] = useState<VoteType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voteStep, setVoteStep] = useState<'idle' | 'encrypting' | 'casting'>('idle');

  if (!isOpen) return null;

  const handleVote = async (voteType: number) => {
    setLoading(true);
    setError(null);
    setVoteStep('encrypting');
    try {
      await onVote(voteType, setVoteStep);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to cast confidential vote');
    } finally {
      setLoading(false);
      setVoteStep('idle');
    }
  };

  const voteOptions = [
    {
      type: VoteType.For,
      label: 'For',
      icon: ThumbsUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/30',
      hoverColor: 'hover:bg-success/20'
    },
    {
      type: VoteType.Against,
      label: 'Against', 
      icon: ThumbsDown,
      color: 'text-danger',
      bgColor: 'bg-danger/10',
      borderColor: 'border-danger/30',
      hoverColor: 'hover:bg-danger/20'
    },
    {
      type: VoteType.Abstain,
      label: 'Abstain',
      icon: MinusCircle,
      color: 'text-abstain',
      bgColor: 'bg-abstain/10',
      borderColor: 'border-abstain/30',
      hoverColor: 'hover:bg-abstain/20'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 dark:bg-card-dark/95 backdrop-blur-sm rounded-2xl max-w-md w-full animate-slide-up shadow-zama-lg border border-zama-light-orange dark:border-border-dark">
        <div className="flex items-center justify-between p-6 border-b border-zama-light-orange dark:border-border-dark">
          <div className="flex items-center gap-2">
            <Shield className="text-primary" size={20} />
            <h2 className="text-xl font-semibold text-accent dark:text-text-primary-dark">Confidential Vote</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark rounded-xl hover:bg-surface dark:hover:bg-surface-dark transition-all duration-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-medium text-accent dark:text-text-primary-dark mb-2">Proposal</h3>
            <p className="text-sm text-text-secondary dark:text-text-secondary-dark line-clamp-2">{proposalTitle}</p>
          </div>

          <div>
            <h3 className="font-medium text-accent dark:text-text-primary-dark mb-3">Select Your Vote</h3>
            <div className="space-y-3">
              {voteOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedVote === option.type;
                
                return (
                  <button
                    key={option.type}
                    onClick={() => setSelectedVote(option.type)}
                    className={`w-full p-4 rounded-xl border-2 transition-all duration-300 ${
                      isSelected 
                        ? `${option.bgColor} ${option.borderColor} ${option.color} shadow-zama` 
                        : `border-zama-light-orange dark:border-border-dark hover:border-text-muted dark:hover:border-text-muted-dark ${option.hoverColor}`
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} className={isSelected ? option.color : 'text-text-muted dark:text-text-muted-dark'} />
                      <span className={`font-medium ${isSelected ? option.color : 'text-accent dark:text-text-primary-dark'}`}>
                        {option.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-accent dark:text-text-primary-dark mb-2">
              Vote Weight
            </label>
            <div className="w-full px-3 py-2 border border-zama-light-orange dark:border-border-dark rounded-xl bg-white/80 dark:bg-card-dark/80 backdrop-blur-sm text-accent dark:text-text-primary-dark transition-all duration-300 flex items-center gap-2">
              <Shield className="text-primary" size={16} />
              <span className="font-mono text-base">{votingPower !== null ? votingPower : '...'}</span>
            </div>
          </div>

          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
            <div className="flex gap-3">
              <Shield className="text-primary flex-shrink-0 mt-0.5" size={16} />
              <div className="text-sm">
                <p className="font-medium text-primary mb-1">Fully Confidential:</p>
                <p className="text-accent dark:text-text-primary-dark">
                  Your vote is encrypted using ZAMA's FHE technology. It remains completely private 
                  until the resolution phase while still being verifiable.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-zama-light-orange dark:border-border-dark bg-surface/50 dark:bg-surface-dark/50 backdrop-blur-sm">
          <button
            onClick={onClose}
            className="px-4 py-2 text-text-secondary dark:text-text-secondary-dark border border-zama-light-orange dark:border-border-dark rounded-xl hover:bg-white dark:hover:bg-card-dark transition-all duration-300"
          >
            Cancel
          </button>
          <button
            onClick={() => handleVote(selectedVote !== null ? selectedVote : 0)}
            disabled={selectedVote === null || loading}
            className="flex items-center gap-2 px-6 py-2 bg-accent dark:bg-primary text-white rounded-xl hover:bg-accent/90 dark:hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium shadow-zama hover:shadow-zama-lg transform hover:scale-105"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                {voteStep === 'encrypting' && 'Encrypting...'}
                {voteStep === 'casting' && 'Casting Vote...'}
                {voteStep === 'idle' && 'Processing...'}
              </>
            ) : (
              <>
                <Vote size={16} />
                Cast Confidential Vote
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-6 border-t border-zama-light-orange dark:border-border-dark bg-surface/50 dark:bg-surface-dark/50 backdrop-blur-sm">
            <p className="text-red-500">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfidentialVoteModal;