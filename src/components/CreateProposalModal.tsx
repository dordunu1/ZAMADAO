import React, { useState } from 'react';
import { X, PlusCircle, Eye, Calendar, Clock, Coins, Users, BadgeDollarSign } from 'lucide-react';

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string, votingDeadline: number, tokenAddress: string, quorum: number) => void;
}

const CreateProposalModal: React.FC<CreateProposalModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [tokenAddress, setTokenAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quorum, setQuorum] = useState(10);
  
  // Default to 2 days for voting
  const now = new Date();
  const defaultVotingEnd = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  
  const [votingEndDate, setVotingEndDate] = useState(defaultVotingEnd.toISOString().split('T')[0]);
  const [votingEndTime, setVotingEndTime] = useState(defaultVotingEnd.toTimeString().slice(0, 5));

  // Hardcoded for now; ideally this would be fetched from the contract
  const proposalFeeEth = 0.2;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && description.trim() && tokenAddress.trim()) {
      setLoading(true);
      setError(null);
      try {
        const votingDeadline = new Date(`${votingEndDate}T${votingEndTime}`).getTime();
        await onSubmit(title.trim(), description.trim(), votingDeadline, tokenAddress.trim(), quorum);
        setTitle('');
        setDescription('');
        setTokenAddress('');
        setQuorum(10);
        onClose();
      } catch (err: any) {
        setError(err.message || 'Failed to create proposal.');
      } finally {
        setLoading(false);
      }
    }
  };

  const renderMarkdown = (text: string) => {
    return text
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-3">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium mb-2">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*$)/gim, '<li class="ml-4">• $1</li>')
      .replace(/\n/g, '<br>');
  };

  const getVotingDuration = () => {
    const voting = new Date(`${votingEndDate}T${votingEndTime}`);
    const diffMs = voting.getTime() - Date.now();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2">
      <div className="bg-white/95 dark:bg-card-dark/95 backdrop-blur-sm rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-slide-up shadow-zama-lg border border-zama-light-orange dark:border-border-dark">
        <div className="flex items-center justify-between p-4 border-b border-zama-light-orange dark:border-border-dark">
          <div className="flex items-center gap-2">
            <PlusCircle className="text-primary" size={20} />
            <h2 className="text-lg font-semibold text-accent dark:text-text-primary-dark">Create New Proposal</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-muted dark:text-text-muted-dark hover:text-text-secondary dark:hover:text-text-secondary-dark rounded-xl hover:bg-surface dark:hover:bg-surface-dark transition-all duration-300"
          >
            <X size={18} />
          </button>
        </div>

        {/* Creation Fee Badge */}
        <div className="flex justify-center mt-2">
          <span className="flex items-center gap-2 bg-yellow-300 text-black font-semibold px-3 py-1 rounded-full shadow border border-yellow-400 text-sm">
            <BadgeDollarSign className="text-black" size={16} />
            Proposal Creation Fee: {proposalFeeEth} ETH
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-auto">
            <div className="p-4 space-y-4">
              <div>
                <label htmlFor="title" className="block text-xs font-medium text-accent dark:text-text-primary-dark mb-1">
                  Proposal Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a clear, descriptive title for your proposal"
                  className="w-full px-3 py-2 border border-zama-light-orange dark:border-border-dark rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white/80 dark:bg-card-dark/80 backdrop-blur-sm text-accent dark:text-text-primary-dark transition-all duration-300 text-sm"
                  required
                />
              </div>

              <div className="flex items-center gap-4 mb-4">
                <label className="block text-sm font-medium text-accent dark:text-text-primary-dark">
                  Description
                </label>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-xl text-sm transition-all duration-300 ${
                    showPreview 
                      ? 'bg-primary text-white shadow-zama' 
                      : 'bg-surface dark:bg-surface-dark text-text-secondary dark:text-text-secondary-dark hover:bg-zama-light-orange dark:hover:bg-border-dark'
                  }`}
                >
                  <Eye size={14} />
                  Preview
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {!showPreview && (
                  <div className="lg:col-span-2">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="# Proposal Summary

Provide a detailed description of your proposal using Markdown formatting.

## Key Points
- Point 1
- Point 2
- Point 3

## Implementation
Describe how the proposal will be implemented.

## Benefits
Explain the benefits to the DAO."
                      className="w-full h-64 px-4 py-3 border border-zama-light-orange dark:border-border-dark rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-sm bg-white/80 dark:bg-card-dark/80 backdrop-blur-sm text-accent dark:text-text-primary-dark transition-all duration-300"
                      required
                    />
                  </div>
                )}

                {showPreview && (
                  <>
                    <div>
                      <h4 className="text-sm font-medium text-accent dark:text-text-primary-dark mb-2">Markdown Input</h4>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full h-64 px-4 py-3 border border-zama-light-orange dark:border-border-dark rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none font-mono text-sm bg-white/80 dark:bg-card-dark/80 backdrop-blur-sm text-accent dark:text-text-primary-dark transition-all duration-300"
                        required
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-accent dark:text-text-primary-dark mb-2">Preview</h4>
                      <div 
                        className="h-64 p-4 border border-zama-light-orange dark:border-border-dark rounded-xl bg-surface dark:bg-surface-dark overflow-auto prose prose-sm max-w-none text-accent dark:text-text-primary-dark"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(description) }}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <label htmlFor="tokenAddress" className="block text-sm font-medium text-accent dark:text-text-primary-dark mb-2 flex items-center gap-2">
                    <Coins className="text-primary" size={18} />
                    Voting Token Address
                  </label>
                  <input
                    type="text"
                    id="tokenAddress"
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    placeholder="0x... (ERC-20 token address required to vote)"
                    className="w-full px-4 py-3 border border-zama-light-orange dark:border-border-dark rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white/80 dark:bg-card-dark/80 backdrop-blur-sm text-accent dark:text-text-primary-dark transition-all duration-300 font-mono"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="quorum" className="block text-sm font-medium text-accent dark:text-text-primary-dark mb-2 flex items-center gap-2">
                    <Users className="text-primary" size={18} />
                    Quorum (%)
                  </label>
                  <input
                    type="number"
                    id="quorum"
                    min="1"
                    max="100"
                    value={quorum}
                    onChange={(e) => setQuorum(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                    placeholder="10"
                    className="w-full px-4 py-3 border border-zama-light-orange dark:border-border-dark rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-white/80 dark:bg-card-dark/80 backdrop-blur-sm text-accent dark:text-text-primary-dark transition-all duration-300 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Voting Timeline Configuration */}
              <div className="bg-surface dark:bg-surface-dark p-4 rounded-xl border border-zama-light-orange/50 dark:border-border-dark mt-4">
                <h4 className="font-medium text-accent dark:text-text-primary-dark mb-2 flex items-center gap-2">
                  <Calendar className="text-primary" size={20} />
                  Voting Timeline
                </h4>
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                  <div className="flex-1">
                    <label className="block text-xs text-text-secondary dark:text-text-secondary-dark mb-1">Date</label>
                    <input
                      type="date"
                      value={votingEndDate}
                      onChange={(e) => setVotingEndDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-2 py-2 border border-zama-light-orange dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white/80 dark:bg-card-dark/80 backdrop-blur-sm text-accent dark:text-text-primary-dark text-sm transition-all duration-300"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-text-secondary dark:text-text-secondary-dark mb-1">Time</label>
                    <input
                      type="time"
                      value={votingEndTime}
                      onChange={(e) => setVotingEndTime(e.target.value)}
                      className="w-full px-2 py-2 border border-zama-light-orange dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white/80 dark:bg-card-dark/80 backdrop-blur-sm text-accent dark:text-text-primary-dark text-sm transition-all duration-300"
                    />
                  </div>
                  <div className="text-xs text-text-muted dark:text-text-muted-dark ml-2 mt-2 sm:mt-0">
                    Duration: {getVotingDuration()} days from now
                  </div>
                </div>
                <div className="mt-2 p-2 bg-primary/10 border border-primary/30 rounded-xl">
                  <div className="flex gap-2 items-center">
                    <Clock className="text-primary flex-shrink-0" size={16} />
                    <span className="text-xs font-medium text-primary">Confidential Voting Process:</span>
                    <span className="text-xs text-accent dark:text-text-primary-dark">
                      Votes are cast confidentially during the voting phase using ZAMA's FHE technology. After voting ends, the resolution phase begins automatically for final tallying.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-4 border-t border-zama-light-orange dark:border-border-dark bg-surface/50 dark:bg-surface-dark/50 backdrop-blur-sm mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-secondary dark:text-text-secondary-dark border border-zama-light-orange dark:border-border-dark rounded-xl hover:bg-white dark:hover:bg-card-dark transition-all duration-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-accent dark:bg-primary text-white rounded-xl hover:bg-accent/90 dark:hover:bg-primary/90 transition-all duration-300 font-medium shadow-zama hover:shadow-zama-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle size={16} />
                  Create Proposal
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 text-red-500 text-sm">{error}</div>
        )}
      </div>
    </div>
  );
};

export default CreateProposalModal;