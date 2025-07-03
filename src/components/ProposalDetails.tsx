import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Link, User, Clock, ThumbsUp, ThumbsDown, MinusCircle, Vote, Settings, CheckCircle, XCircle, Shield, AlertCircle, Copy, Link2 } from 'lucide-react';
import { Proposal, ProposalStatus, VoteType } from '../types/proposal';
import StatusBadge from './StatusBadge';
import ProgressTimeline from './ProgressTimeline';
import CountdownTimer from './CountdownTimer';
import ConfidentialVoteModal from './ConfidentialVoteModal';
import { formatDate } from '../utils/time';
import { getFheInstance } from '../utils/fheInstance';
import { useWriteContract, useAccount } from 'wagmi';
import { DAO_CONTRACT_ADDRESS, DAO_ABI, fetchProposalById, isRevealRequested, hasVoted } from '../utils/daoContract';
import { getAddress } from 'ethers';
import { hexlify } from 'ethers';
import { BrowserProvider } from 'ethers';
import { ethers } from 'ethers';
import { getVotesForProposal } from '../utils/firestoreProposals';

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
  const [decryptedTallies, setDecryptedTallies] = useState<{ for: number, against: number, abstain: number } | null>(null);
  const lastLoggedProposalId = useRef<number | null>(null);
  const [revealRequested, setRevealRequested] = useState(false);
  const [hasUserVoted, setHasUserVoted] = useState(userVoted);
  const { address: connectedAddress } = useAccount();
  const isCreator = connectedAddress && proposal.creator && connectedAddress.toLowerCase() === proposal.creator.toLowerCase();
  const [isResolving, setIsResolving] = useState(false);
  const [votes, setVotes] = useState<any[]>([]);
  const [userVotingPower, setUserVotingPower] = useState<number | null>(null);
  const [checkingVotingPower, setCheckingVotingPower] = useState(false);

  const canVote = proposal.status === ProposalStatus.Active && !hasUserVoted;
  const canResolve = proposal.status === ProposalStatus.Reveal && !revealRequested;

  const totalVotes = votes.length;
  const confidentialVotes = votes.length; // All votes are confidential in this system
  const privacyRate = totalVotes > 0 ? Math.round((confidentialVotes / totalVotes) * 100) : 0;

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

      // Fetch the user's token balance for weighted voting
      let provider;
      if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
      } else {
        throw new Error('No Ethereum provider found');
      }
      const tokenContract = new ethers.Contract(proposal.token, [
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ], provider);
      const balance = await tokenContract.balanceOf(userAddress);
      const decimals = await tokenContract.decimals();
      const normalizedBalance = Number(ethers.formatUnits(balance, decimals));
      console.log('User token balance (raw):', balance.toString());
      console.log('User token balance (normalized):', normalizedBalance);

      // Encrypt the normalized balance as the vote value
      const ciphertext = await fhe.createEncryptedInput(contractAddressChecksum, userAddress);
      ciphertext.add64(normalizedBalance);
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
        gas: BigInt(1000000),
      });

      onCastVote(voteType, normalizedBalance);
    } catch (err) {
      console.error('Error in handleConfidentialVote:', err);
    }
  };

  // Use only revealRequested to determine if proposal is resolved
  const isProposalResolved = revealRequested;

  useEffect(() => {
    const decryptTallies = async () => {
      const fhe = getFheInstance();
      if (!fhe) return;

      let provider;
      if (window.ethereum) {
        provider = new BrowserProvider(window.ethereum);
      } else {
        console.error('No Ethereum provider found');
        return;
      }
      // Always use the correct on-chain proposal ID
      const onChainProposal = await fetchProposalById(proposal.id, provider);

      // Try both named and indexed access
      const handlesNamed = [
        onChainProposal.forVotes,
        onChainProposal.againstVotes,
        onChainProposal.abstainVotes
      ];
      const handlesIndexed = [
        onChainProposal[3], // forVotes
        onChainProposal[4], // againstVotes
        onChainProposal[5]  // abstainVotes
      ];
      // Use handlesIndexed if handlesNamed are undefined
      const handles = handlesNamed.every(h => h !== undefined) ? handlesNamed : handlesIndexed;

      // Only log once per proposal ID
      if (lastLoggedProposalId.current !== proposal.id) {
        console.log('Decrypting tallies for proposal', proposal.id, 'with handles:', handles);
        handles.forEach((h, i) => {
          const len = typeof h === 'string' ? h.length : undefined;
          console.log(['forVotes', 'againstVotes', 'abstainVotes'][i] + ':', h, 'type:', typeof h, 'length:', len);
        });
        lastLoggedProposalId.current = proposal.id;
      }

      // Only decrypt if they are valid ciphertexts
      if (handles.every(h => typeof h === 'string' && h.startsWith('0x') && h.length === 66)) {
        try {
          const values = await fhe.publicDecrypt(handles);
          setDecryptedTallies({
            for: values[handles[0]],
            against: values[handles[1]],
            abstain: values[handles[2]]
          });
        } catch (err) {
          console.error('Failed to decrypt tallies:', err);
        }
      } else {
        // Optionally show a message: "Tally not revealed yet"
      }
    };

    if (isProposalResolved) {
      decryptTallies();
    }
  }, [proposal, isProposalResolved]);

  // Fetch reveal requested and hasVoted state
  useEffect(() => {
    const fetchStates = async () => {
      let provider;
      if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
      } else {
        return;
      }
      // Check if reveal has been requested
      const reveal = await isRevealRequested(proposal.id, provider);
      setRevealRequested(reveal);
      // Check if user has voted
      const accounts = await provider.send('eth_requestAccounts', []);
      const userAddress = accounts[0];
      const voted = await hasVoted(proposal.id, userAddress, provider);
      setHasUserVoted(voted);
    };
    fetchStates();
  }, [proposal.id]);

  // Handler for resolve button
  const handleResolveClick = async () => {
    setIsResolving(true);
    try {
      await onResolve(proposal.id);
    } finally {
      setIsResolving(false);
    }
  };

  useEffect(() => {
    // Fetch votes from Firestore
    getVotesForProposal(proposal.id).then(setVotes);
  }, [proposal.id]);

  useEffect(() => {
    // Fetch user's voting power (ERC20 balance)
    const fetchVotingPower = async () => {
      if (!connectedAddress || !proposal.token) {
        setUserVotingPower(null);
        return;
      }
      setCheckingVotingPower(true);
      try {
        let provider;
        if (window.ethereum) {
          provider = new ethers.BrowserProvider(window.ethereum);
        } else {
          setUserVotingPower(null);
          return;
        }
        const tokenContract = new ethers.Contract(proposal.token, [
          'function balanceOf(address) view returns (uint256)',
          'function decimals() view returns (uint8)'
        ], provider);
        const balance = await tokenContract.balanceOf(connectedAddress);
        const decimals = await tokenContract.decimals();
        const normalizedBalance = Number(ethers.formatUnits(balance, decimals));
        setUserVotingPower(normalizedBalance);
      } catch (err) {
        setUserVotingPower(null);
      } finally {
        setCheckingVotingPower(false);
      }
    };
    fetchVotingPower();
  }, [connectedAddress, proposal.token]);

  function truncateAddress(address: string) {
    if (!address) return '';
    return address.slice(0, 6) + '...' + address.slice(-4);
  }

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
            <span>Created by {truncateAddress(proposal.creator)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} />
            <span>{formatDate(proposal.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-xl">
            <Shield size={16} className="text-primary" />
            <span className="text-primary font-medium">Confidential Voting</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-surface dark:bg-surface-dark rounded-xl border border-zama-light-orange dark:border-border-dark">
            <Link2 size={16} className="text-primary" />
            <span className="font-mono">{truncateAddress(proposal.token)}</span>
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
          resolved={isProposalResolved}
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
              disabled={!canVote || checkingVotingPower || userVotingPower === 0}
            >
              <Vote size={16} />
              Cast Confidential Vote
            </button>
          )}
          
          {canResolve && isCreator && (
            <button
              onClick={handleResolveClick}
              className="flex items-center gap-2 px-6 py-3 bg-success text-white rounded-xl hover:bg-success/90 transition-all duration-300 font-medium shadow-zama hover:shadow-zama-lg transform hover:scale-105"
              disabled={!canResolve || isResolving}
            >
              <Settings size={16} />
              {isResolving ? 'Resolving...' : 'Resolve Proposal'}
            </button>
          )}
        </div>
        {/* Show Voted status if user has voted */}
        {hasUserVoted && (
          <div className="flex items-center gap-2 mt-4 px-6 py-3 bg-success/10 text-success border border-success/30 rounded-xl w-fit">
            <CheckCircle size={18} />
            <span className="font-medium">You have voted</span>
          </div>
        )}
        {/* Show no voting power message if user has 0 tokens */}
        {userVotingPower === 0 && (
          <div className="flex items-center gap-2 mt-4 px-6 py-3 bg-danger/10 text-danger border border-danger/30 rounded-xl w-fit">
            <AlertCircle size={18} />
            <span className="font-medium">You have no voting power for this proposal</span>
          </div>
        )}

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
            <div className="text-3xl font-bold text-accent dark:text-text-primary-dark">{totalVotes}</div>
            <div className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">Total Votes</div>
          </div>
          <div className="text-center p-6 bg-surface dark:bg-surface-dark rounded-xl">
            <div className="text-3xl font-bold text-accent dark:text-text-primary-dark">{confidentialVotes}</div>
            <div className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">Confidential Votes</div>
          </div>
          <div className="text-center p-6 bg-surface dark:bg-surface-dark rounded-xl">
            <div className="text-3xl font-bold text-accent dark:text-text-primary-dark">{privacyRate}%</div>
            <div className="text-sm text-text-secondary dark:text-text-secondary-dark mt-1">Privacy Rate</div>
          </div>
        </div>
      </div>

      {/* Results */}
      {(isProposalResolved || totalVotes > 0) && (
        <div className="bg-white/90 dark:bg-card-dark/90 backdrop-blur-sm border border-zama-light-orange dark:border-border-dark rounded-2xl p-8 shadow-zama">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-accent dark:text-text-primary-dark">Results</h2>
            {isProposalResolved && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
                proposal.passed 
                  ? 'bg-success/10 text-success border border-success/30' 
                  : 'bg-danger/10 text-danger border border-danger/30'
              }`}>
                {proposal.passed ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {proposal.passed ? 'Passed' : 'Resolved'}
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
                <div className="text-2xl font-bold text-success">
                  {isProposalResolved
                    ? (decryptedTallies?.for?.toLocaleString() ?? <span className="text-success">Decrypting...</span>)
                    : <span className="text-success">Encrypted</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 bg-danger/5 dark:bg-danger/10 rounded-xl">
              <div className="flex items-center gap-3">
                <ThumbsDown className="text-danger" size={24} />
                <span className="font-medium text-accent dark:text-text-primary-dark text-lg">Against</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-danger">
                  {isProposalResolved
                    ? (decryptedTallies?.against?.toLocaleString() ?? <span className="text-danger">Decrypting...</span>)
                    : <span className="text-danger">Encrypted</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 bg-abstain/5 dark:bg-abstain/10 rounded-xl">
              <div className="flex items-center gap-3">
                <MinusCircle className="text-abstain" size={24} />
                <span className="font-medium text-accent dark:text-text-primary-dark text-lg">Abstain</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-abstain">
                  {isProposalResolved
                    ? (decryptedTallies?.abstain?.toLocaleString() ?? <span className="text-abstain">Decrypting...</span>)
                    : <span className="text-abstain">Encrypted</span>}
                </div>
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
        votingPower={userVotingPower}
      />
    </div>
  );
};

export default ProposalDetails;