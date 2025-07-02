import React, { useState } from 'react';
import { X, ThumbsUp, ThumbsDown, MinusCircle, Download, AlertCircle } from 'lucide-react';
import { VoteType, CommitData } from '../types/proposal';
import { generateSalt, computeCommitment, downloadJSON } from '../utils/crypto';

interface VoteCommitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommit: (commitment: string, voteType: VoteType, weight: number) => void;
  proposalId: number;
  proposalTitle: string;
  userAddress: string;
}

const VoteCommitModal: React.FC<VoteCommitModalProps> = ({
  isOpen,
  onClose,
  onCommit,
  proposalId,
  proposalTitle,
  userAddress
}) => {
  const [selectedVote, setSelectedVote] = useState<VoteType | null>(null);
  const [weight, setWeight] = useState(1);
  const [isCommitting, setIsCommitting] = useState(false);

  if (!isOpen) return null;

  const handleCommit = async () => {
    if (selectedVote === null) return;

    setIsCommitting(true);
    
    try {
      const salt = generateSalt();
      const commitment = computeCommitment(userAddress, proposalId, selectedVote, weight, salt);
      
      const commitData: CommitData = {
        proposalId,
        voteType: selectedVote,
        weight,
        salt,
        voter: userAddress,
        commitment
      };

      // Download the commit data
      downloadJSON(commitData, `vote-commit-${proposalId}-${Date.now()}.json`);
      
      // Submit commitment
      await onCommit(commitment, selectedVote, weight);
      
      onClose();
    } catch (error) {
      console.error('Commit failed:', error);
    } finally {
      setIsCommitting(false);
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
          <h2 className="text-xl font-semibold text-accent dark:text-text-primary-dark">Cast Your Vote</h2>
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
            <label htmlFor="weight" className="block text-sm font-medium text-accent dark:text-text-primary-dark mb-2">
              Vote Weight
            </label>
            <input
              type="number"
              id="weight"
              min="1"
              value={weight}
              onChange={(e) => setWeight(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 border border-zama-light-orange dark:border-border-dark rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white/80 dark:bg-card-dark/80 backdrop-blur-sm text-accent dark:text-text-primary-dark transition-all duration-300"
            />
          </div>

          <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertCircle className="text-warning flex-shrink-0 mt-0.5" size={16} />
              <div className="text-sm">
                <p className="font-medium text-warning mb-1">Important:</p>
                <p className="text-accent dark:text-text-primary-dark">
                  After committing, you'll download a file containing your vote data. 
                  Keep this file safe - you'll need it to reveal your vote later.
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
            onClick={handleCommit}
            disabled={selectedVote === null || isCommitting}
            className="flex items-center gap-2 px-6 py-2 bg-accent dark:bg-primary text-white rounded-xl hover:bg-accent/90 dark:hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium shadow-zama hover:shadow-zama-lg transform hover:scale-105"
          >
            {isCommitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Committing...
              </>
            ) : (
              <>
                <Download size={16} />
                Commit Vote
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoteCommitModal;