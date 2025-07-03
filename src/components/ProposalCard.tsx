import React, { useEffect, useState } from 'react';
import { User, Clock, Shield, Link, ThumbsUp, ThumbsDown, MinusCircle, Users } from 'lucide-react';
import { Proposal } from '../types/proposal';
import StatusBadge from './StatusBadge';
import { formatTimeRemaining, formatDate } from '../utils/time';
import { getVotesForProposal } from '../utils/firestoreProposals';

interface ProposalCardProps {
  proposal: Proposal;
  onView: (id: number) => void;
  onShare: (id: number) => void;
}

const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, onView, onShare }) => {
  const [voteCount, setVoteCount] = useState(0);

  useEffect(() => {
    getVotesForProposal(proposal.id).then(votes => setVoteCount(votes.length));
  }, [proposal.id]);

  const getNextDeadline = () => {
    const now = Date.now();
    if (now < proposal.votingDeadline) {
      return { label: 'Voting ends', deadline: proposal.votingDeadline };
    }
    if (now < proposal.resolutionDeadline) {
      return { label: 'Resolution deadline', deadline: proposal.resolutionDeadline };
    }
    return null;
  };

  const nextDeadline = getNextDeadline();
  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;

  function truncateAddress(address: string) {
    if (!address) return '';
    return address.slice(0, 6) + '...' + address.slice(-4);
  }

  return (
    <div className="bg-white/90 dark:bg-card-dark/90 backdrop-blur-sm border border-zama-light-orange dark:border-border-dark rounded-xl p-6 hover:shadow-zama-lg transition-all duration-300 animate-fade-in transform hover:scale-[1.02]">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-accent dark:text-text-primary-dark mb-2 line-clamp-2">
            {proposal.title}
          </h3>
          <div className="flex items-center gap-4 text-sm text-text-secondary dark:text-text-secondary-dark mb-3">
            <div className="flex items-center gap-1">
              <User size={14} />
              <span>{truncateAddress(proposal.creator)}</span>
            </div>
            {proposal.quorum && (
              <div className="flex flex-row items-center gap-1 px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded-xl ml-2 whitespace-nowrap">
                <Users size={14} />
                <span className="font-medium whitespace-nowrap">Quorum: {proposal.quorum}%</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <StatusBadge status={proposal.status} size="sm" />
          <button
            onClick={() => onShare(proposal.id)}
            className="p-2 text-text-muted dark:text-text-muted-dark hover:text-primary transition-all duration-300 rounded-lg hover:bg-surface dark:hover:bg-surface-dark"
            title="Share proposal"
          >
            <Link size={16} />
          </button>
        </div>
      </div>

      <p className="text-text-secondary dark:text-text-secondary-dark text-sm mb-4 line-clamp-3">
        {proposal.description.replace(/#{1,6}\s/g, '').substring(0, 150)}...
      </p>

      {proposal.resolved && totalVotes > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-surface dark:bg-surface-dark rounded-xl">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-success mb-1">
              <ThumbsUp size={14} />
              <span className="text-sm font-semibold">For</span>
            </div>
            <div className="text-lg font-bold text-success">{proposal.forVotes.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-danger mb-1">
              <ThumbsDown size={14} />
              <span className="text-sm font-semibold">Against</span>
            </div>
            <div className="text-lg font-bold text-danger">{proposal.againstVotes.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-abstain mb-1">
              <MinusCircle size={14} />
              <span className="text-sm font-semibold">Abstain</span>
            </div>
            <div className="text-lg font-bold text-abstain">{proposal.abstainVotes.toLocaleString()}</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-text-secondary dark:text-text-secondary-dark">
          <div className="flex items-center gap-1">
            <Shield size={14} className="text-primary" />
            <span>Confidential: {voteCount}</span>
          </div>
          <span>Total: {voteCount}</span>
        </div>
        <button
          onClick={() => onView(proposal.id)}
          className="px-4 py-2 bg-accent dark:bg-primary text-white rounded-xl hover:bg-accent/90 dark:hover:bg-primary/90 transition-all duration-300 font-medium shadow-zama hover:shadow-zama-lg transform hover:scale-105"
        >
          View Details
        </button>
      </div>
    </div>
  );
};

export default ProposalCard;