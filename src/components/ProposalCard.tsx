import React, { useEffect, useState } from 'react';
import { User, Clock, Shield, Link, ThumbsUp, ThumbsDown, MinusCircle, Users, CheckCircle } from 'lucide-react';
import { Proposal, ProposalStatus } from '../types/proposal';
import StatusBadge from './StatusBadge';
import { formatTimeRemaining, formatDate } from '../utils/time';
import { getVotesForProposal } from '../utils/firestoreProposals';
import { useAccount } from 'wagmi';
import { DAO_CONTRACT_ADDRESS, DAO_ABI } from '../utils/daoContract';
import { ethers } from 'ethers';

interface ProposalCardProps {
  proposal: Proposal;
  onView: (id: number) => void;
  onShare: (id: number) => void;
}

const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, onView, onShare }) => {
  const [voteCount, setVoteCount] = useState(0);
  // Remove Firestore-based userVote
  const [hasVotedOnChain, setHasVotedOnChain] = useState(false);
  const [userVotingPower, setUserVotingPower] = useState<string | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null);
  const { address: connectedAddress } = useAccount();
  const [isOnChainResolved, setIsOnChainResolved] = useState(false);
  const [revealedTallies, setRevealedTallies] = useState<{for: number, against: number, abstain: number} | null>(null);
  // Remove on-chain voting power and symbol state

  useEffect(() => {
    getVotesForProposal(proposal.id).then(votes => {
      setVoteCount(votes.length);
    });
    // Fetch on-chain resolved state, revealed tallies, hasVoted, and voting power
    async function fetchOnChainStatus() {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(DAO_CONTRACT_ADDRESS, DAO_ABI, provider);
        const onChainProposal = await contract.proposals(proposal.id);
        setIsOnChainResolved(onChainProposal.resolved);
        if (onChainProposal.resolved) {
          setRevealedTallies({
            for: Number(onChainProposal.revealedFor),
            against: Number(onChainProposal.revealedAgainst),
            abstain: Number(onChainProposal.revealedAbstain)
          });
        }
        // On-chain hasVoted check
        if (proposal.id !== undefined && connectedAddress) {
          const voted = await contract.hasVoted(proposal.id, connectedAddress);
          setHasVotedOnChain(voted);
          // If voted, fetch current voting power and token symbol
          if (voted && proposal.token) {
            const tokenContract = new ethers.Contract(proposal.token, [
              'function balanceOf(address) view returns (uint256)',
              'function decimals() view returns (uint8)',
              'function symbol() view returns (string)'
            ], provider);
            const [balance, decimals, symbol] = await Promise.all([
              tokenContract.balanceOf(connectedAddress),
              tokenContract.decimals(),
              tokenContract.symbol()
            ]);
            const normalized = Number(ethers.formatUnits(balance, decimals));
            let display = '';
            if (normalized >= 1e6) {
              display = (normalized / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'M';
            } else {
              display = normalized.toLocaleString(undefined, { maximumFractionDigits: 2 });
            }
            setUserVotingPower(display);
            setTokenSymbol(symbol);
          } else {
            setUserVotingPower(null);
            setTokenSymbol(null);
          }
        } else {
          setHasVotedOnChain(false);
          setUserVotingPower(null);
          setTokenSymbol(null);
        }
      } catch (err) {
        setHasVotedOnChain(false);
        setUserVotingPower(null);
        setTokenSymbol(null);
      }
    }
    fetchOnChainStatus();
  }, [proposal.id, connectedAddress, proposal.token]);

  const effectiveStatus: ProposalStatus = isOnChainResolved ? ProposalStatus.Closed : proposal.status;
  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;

  function truncateAddress(address: string) {
    if (!address) return '';
    return address.slice(0, 6) + '...' + address.slice(-4);
  }

  function truncateTitle(title: string, maxLength: number = 20) {
    if (!title) return '';
    return title.length > maxLength ? title.slice(0, maxLength) + '...' : title;
  }

  return (
    <div className="relative bg-white/90 dark:bg-card-dark/90 backdrop-blur-sm border border-zama-light-orange dark:border-border-dark rounded-xl p-6 hover:shadow-zama-lg transition-all duration-300 animate-fade-in transform hover:scale-[1.02]">
      <div className="flex flex-row items-center gap-2 mb-2">
        <StatusBadge status={effectiveStatus} size="sm" />
        {proposal.quorum && (
          <div className="flex flex-row items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md text-xs font-medium whitespace-nowrap">
            <Users size={14} />
            <span>Quorum: {proposal.quorum}%</span>
          </div>
        )}
      </div>
      {/* Absolute link icon in top-right */}
      <button
        onClick={() => onShare(proposal.id)}
        className="absolute top-4 right-4 p-2 text-text-muted dark:text-text-muted-dark hover:text-primary transition-all duration-300 rounded-lg hover:bg-surface dark:hover:bg-surface-dark"
        title="Share proposal"
      >
        <Link size={16} />
      </button>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-accent dark:text-text-primary-dark mb-2 line-clamp-2">
            {truncateTitle(proposal.title)}
          </h3>
          <div className="flex items-center gap-4 text-sm text-text-secondary dark:text-text-secondary-dark mb-3">
            <div className="flex items-center gap-1">
              <User size={14} />
              <span>{truncateAddress(proposal.creator)}</span>
            </div>
          </div>
          {/* Show badges if user has voted on-chain */}
          {hasVotedOnChain && (
            <div className="flex flex-row items-center gap-2 mt-1 whitespace-nowrap">
              <div className="flex items-center gap-1 px-2 py-0.5 bg-success/10 text-success border border-success/20 rounded-md text-xs font-medium whitespace-nowrap">
                <CheckCircle size={14} />
                <span>Voted successfully</span>
              </div>
              {userVotingPower && tokenSymbol && (
                <div className="flex items-center gap-1 px-2 py-0.5 bg-success/10 text-success border border-success/20 rounded-md text-xs font-medium whitespace-nowrap">
                  <CheckCircle size={14} />
                  <span>Voting Power: {userVotingPower} {tokenSymbol}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="text-text-secondary dark:text-text-secondary-dark text-sm mb-4 line-clamp-3">
        {proposal.description.replace(/#{1,6}\s/g, '').substring(0, 150)}...
      </p>

      {isOnChainResolved && revealedTallies && (
        <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-surface dark:bg-surface-dark rounded-xl">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-success mb-1">
              <ThumbsUp size={14} />
              <span className="text-sm font-semibold">For</span>
            </div>
            <div className="text-lg font-bold text-success">{revealedTallies.for.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-danger mb-1">
              <ThumbsDown size={14} />
              <span className="text-sm font-semibold">Against</span>
            </div>
            <div className="text-lg font-bold text-danger">{revealedTallies.against.toLocaleString()}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-abstain mb-1">
              <MinusCircle size={14} />
              <span className="text-sm font-semibold">Abstain</span>
            </div>
            <div className="text-lg font-bold text-abstain">{revealedTallies.abstain.toLocaleString()}</div>
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