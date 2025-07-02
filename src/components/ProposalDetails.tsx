import React, { useState } from 'react';
import { ArrowLeft, Link, User, Clock, ThumbsUp, ThumbsDown, MinusCircle, Vote, Settings, CheckCircle, XCircle, Shield } from 'lucide-react';
import { Proposal, ProposalStatus, VoteType } from '../types/proposal';
import StatusBadge from './StatusBadge';
import ProgressTimeline from './ProgressTimeline';
import CountdownTimer from './CountdownTimer';
import ConfidentialVoteModal from './ConfidentialVoteModal';
import { formatDate } from '../utils/time';
import { getFheInstance } from '../utils/fheInstance';
import { useWriteContract } from 'wagmi';
import { DAO_CONTRACT_ADDRESS, DAO_ABI } from '../utils/daoContract';
import { getAddress } from 'ethers';
import { hexlify } from 'ethers';

interface ProposalDetailsProps {
  proposal: Proposal;
  onBack: () => void;
  onShare: (id: number) => void;
  onCastVote: (voteType: VoteType, weight: number) => void;
  onResolve: (id: number) => void;
  userVoted: boolean;
}

const ProposalDetails: React.FC<ProposalDetailsProps> = ({
  proposal,
  onBack,
  onShare,
  onCastVote,
  onResolve,
  userVoted
}) => {
  const [showVoteModal, setShowVoteModal] = useState(false);
  const { writeContractAsync } = useWriteContract();

  const canVote = proposal.status === ProposalStatus.Active && !userVoted;
  const canResolve = proposal.status === ProposalStatus.Reveal && !proposal.resolved;

  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
  const forPercentage = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (proposal.againstVotes / totalVotes) * 100 : 0;
  const abstainPercentage = totalVotes > 0 ? (proposal.abstainVotes / totalVotes) * 100 : 0;

  const renderMarkdown = (text: string) => {
    return text
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4 text-accent dark:text-text-primary-dark">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-3 text-accent dark:text-text-primary-dark">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium mb-2 text-accent dark:text-text-primary-dark">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')  
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/^- (.*$)/gim, '<li class="ml-6 mb-1">• $1</li>')
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/\n/g, '<br>');
  };

  // Utility function to convert Uint8Array to hex string
  function uint8ArrayToHex(uint8arr: Uint8Array): string {
    return '0x' + Array.from(uint8arr)
      .map((x: number) => x.toString(16).padStart(2, '0'))
      .join('');
  }

  const handleConfidentialVote = async (voteType: number) => {
    try {
      console.log('handleConfidentialVote called');
      const fhe = getFheInstance();
      console.log('FHE instance:', fhe);
      if (!fhe) throw new Error('FHE instance not initialized');

      // Convert contract address to checksum format and cast to `0x${string}`
      const contractAddressChecksum = getAddress(DAO_CONTRACT_ADDRESS) as `0x${string}`;
      console.log('Using contract address (checksum):', contractAddressChecksum);

      const userAddress = window.ethereum.selectedAddress || (await window.ethereum.request({ method: 'eth_accounts' }))[0];
      console.log('Using user address:', userAddress);
      const ciphertext = await fhe.createEncryptedInput(contractAddressChecksum, userAddress);
      ciphertext.add64(voteType); // dev approach: use plain number
      const { handles, inputProof } = await ciphertext.encrypt();
      const encryptedHex = hexlify(handles[0]);
      const proofHex = hexlify(inputProof);
      console.log('Submitting vote with:', {
        proposalId: proposal.id,
        encrypted: encryptedHex,
        inputProof: proofHex
      });

      await writeContractAsync({
        address: contractAddressChecksum,
        abi: DAO_ABI,
        functionName: 'vote',
        args: [proposal.id, encryptedHex, proofHex],
        gas: BigInt(5_000_000),
      });

      onCastVote(voteType, 1);
    } catch (err) {
      console.error('Error in handleConfidentialVote:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-text-secondary dark:text-text-secondary-dark hover:text-accent dark:hover:text-text-primary-dark transition-all duration-300"
        >
          <ArrowLeft size={20} />
          <span>Back to Dashboard</span>
        </button>
        <div className="flex items-center gap-3">
          <StatusBadge status={proposal.status} />
          <button
            onClick={() => onShare(proposal.id)}
            className="flex items-center gap-2 px-3 py-2 text-text-secondary dark:text-text-secondary-dark border border-zama-light-orange dark:border-border-dark rounded-xl hover:bg-white dark:hover:bg-surface-dark transition-all duration-300"
          >
            <Link size={16} />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      {/* Proposal Info */}
      <div className="bg-white/90 dark:bg-card-dark/90 backdrop-blur-sm border border-zama-light-orange dark:border-border-dark rounded-2xl p-8 shadow-zama">
        <h1 className="text-3xl font-bold text-accent dark:text-text-primary-dark mb-6">{proposal.title}</h1>
        
        <div className="flex flex-wrap items-center gap-6 text-sm text-text-secondary dark:text-text-secondary-dark mb-8">
          <div className="flex items-center gap-2">
            <User size={16} />
            <span>Created by {proposal.creator}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} />
            <span>{formatDate(proposal.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-xl">
            <Shield size={16} className="text-primary" />
            <span className="text-primary font-medium">Confidential Voting</span>
          </div>
        </div>

        <div 
          className="prose prose-gray max-w-none mb-6 text-accent dark:text-text-primary-dark"
          dangerouslySetInnerHTML={{ __html: `<p class="mb-4">${renderMarkdown(proposal.description)}</p>` }}
        />
      </div>

      {/* Timeline */}
      <div className="bg-white/90 dark:bg-card-dark/90 backdrop-blur-sm border border-zama-light-orange dark:border-border-dark rounded-2xl p-8 shadow-zama">
        <h2 className="text-xl font-semibold mb-8 text-accent dark:text-text-primary-dark">Voting Timeline</h2>
        <ProgressTimeline
          status={proposal.status}
          votingDeadline={proposal.votingDeadline}
          resolutionDeadline={proposal.resolutionDeadline}
          resolved={proposal.resolved}
        />
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {proposal.status === ProposalStatus.Active && (
            <CountdownTimer
              targetDate={proposal.votingDeadline}
              label="Voting ends"
              className="text-primary"
            />
          )}
          {proposal.status === ProposalStatus.Reveal && (
            <CountdownTimer
              targetDate={proposal.resolutionDeadline}
              label="Resolution deadline"
              className="text-warning"
            />
          )}
        </div>
      </div>

      {/* Voting Actions */}
      <div className="bg-white/90 dark:bg-card-dark/90 backdrop-blur-sm border border-zama-light-orange dark:border-border-dark rounded-2xl p-8 shadow-zama">
        <h2 className="text-xl font-semibold mb-6 text-accent dark:text-text-primary-dark">Voting Actions</h2>
        
        <div className="flex flex-wrap gap-4">
          {canVote && (
            <button
              onClick={() => setShowVoteModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-accent dark:bg-primary text-white rounded-xl hover:bg-accent/90 dark:hover:bg-primary/90 transition-all duration-300 font-medium shadow-zama hover:shadow-zama-lg transform hover:scale-105"
            >
              <Vote size={16} />
              Cast Confidential Vote
            </button>
          )}
          
          {canResolve && (
            <button
              onClick={() => onResolve(proposal.id)}
              className="flex items-center gap-2 px-6 py-3 bg-success text-white rounded-xl hover:bg-success/90 transition-all duration-300 font-medium shadow-zama hover:shadow-zama-lg transform hover:scale-105"
            >
              <Settings size={16} />
              Resolve Proposal
            </button>
          )}
          
          {userVoted && proposal.status === ProposalStatus.Active && (
            <div className="flex items-center gap-2 px-6 py-3 bg-success/10 text-success border border-success/30 rounded-xl">
              <CheckCircle size={16} />
              <span className="font-medium">Vote Cast Confidentially</span>
            </div>
          )}
        </div>

        {proposal.status === ProposalStatus.Active && (
          <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <div className="flex items-start gap-3">
              <Shield className="text-primary flex-shrink-0 mt-1" size={20} />
              <div>
                <h4 className="font-medium text-primary mb-2">Confidential Voting</h4>
                <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
                  Your vote is encrypted and remains private until the resolution phase. 
                  ZAMA's FHE technology ensures complete confidentiality while maintaining verifiability.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Participation Stats */}
      <div className="bg-white/90 dark:bg-card-dark/90 backdrop-blur-sm border border-zama-light-orange dark:border-border-dark rounded-2xl p-8 shadow-zama">
        <h2 className="text-xl font-semibold mb-6 text-accent dark:text-text-primary-dark">Participation</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-surface dark:bg-surface-dark rounded-xl">
            <div className="text-3xl font-bold text-accent dark:text-text-primary-dark">{proposal.totalVotes}</div>
            <div className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">Total Votes</div>
          </div>
          <div className="text-center p-6 bg-surface dark:bg-surface-dark rounded-xl">
            <div className="text-3xl font-bold text-accent dark:text-text-primary-dark">{proposal.confidentialVotes}</div>
            <div className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">Confidential Votes</div>
          </div>
          <div className="text-center p-6 bg-surface dark:bg-surface-dark rounded-xl">
            <div className="text-3xl font-bold text-accent dark:text-text-primary-dark">
              {proposal.totalVotes > 0 ? Math.round((proposal.confidentialVotes / proposal.totalVotes) * 100) : 0}%
            </div>
            <div className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">Privacy Rate</div>
          </div>
        </div>
      </div>

      {/* Results */}
      {(proposal.resolved || totalVotes > 0) && (
        <div className="bg-white/90 dark:bg-card-dark/90 backdrop-blur-sm border border-zama-light-orange dark:border-border-dark rounded-2xl p-8 shadow-zama">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-accent dark:text-text-primary-dark">Results</h2>
            {proposal.resolved && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
                proposal.passed 
                  ? 'bg-success/10 text-success border border-success/30' 
                  : 'bg-danger/10 text-danger border border-danger/30'
              }`}>
                {proposal.passed ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {proposal.passed ? 'Passed' : 'Failed'}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-6 bg-success/5 dark:bg-success/10 rounded-xl">
              <div className="flex items-center gap-3">
                <ThumbsUp className="text-success" size={24} />
                <span className="font-medium text-accent dark:text-text-primary-dark text-lg">For</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-success">{proposal.forVotes.toLocaleString()}</div>
                <div className="text-sm text-text-secondary dark:text-text-secondary-dark">{forPercentage.toFixed(1)}%</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 bg-danger/5 dark:bg-danger/10 rounded-xl">
              <div className="flex items-center gap-3">
                <ThumbsDown className="text-danger" size={24} />
                <span className="font-medium text-accent dark:text-text-primary-dark text-lg">Against</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-danger">{proposal.againstVotes.toLocaleString()}</div>
                <div className="text-sm text-text-secondary dark:text-text-secondary-dark">{againstPercentage.toFixed(1)}%</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 bg-abstain/5 dark:bg-abstain/10 rounded-xl">
              <div className="flex items-center gap-3">
                <MinusCircle className="text-abstain" size={24} />
                <span className="font-medium text-accent dark:text-text-primary-dark text-lg">Abstain</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-abstain">{proposal.abstainVotes.toLocaleString()}</div>
                <div className="text-sm text-text-secondary dark:text-text-secondary-dark">{abstainPercentage.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confidential Vote Modal */}
      <ConfidentialVoteModal
        isOpen={showVoteModal}
        onClose={() => setShowVoteModal(false)}
        onVote={handleConfidentialVote}
        proposalId={proposal.id.toString()}
        proposalTitle={proposal.title}
      />
    </div>
  );
};

export default ProposalDetails;