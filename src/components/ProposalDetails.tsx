import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Link, User, Clock, ThumbsUp, ThumbsDown, MinusCircle, Vote, Settings, CheckCircle, XCircle, Shield, AlertCircle, Copy, Link2, Loader2, BarChart2, Unlock } from 'lucide-react';
import { Proposal, ProposalStatus, VoteType } from '../types/proposal';
import StatusBadge from './StatusBadge';
import ProgressTimeline from './ProgressTimeline';
import CountdownTimer from './CountdownTimer';
import ConfidentialVoteModal from './ConfidentialVoteModal';
import { formatDate } from '../utils/time';
import { getFheInstance, decryptValue } from '../utils/fheInstance';
import { useWriteContract, useAccount } from 'wagmi';
import { DAO_CONTRACT_ADDRESS, DAO_ABI, fetchRevealedTallies } from '../utils/daoContract';
import { getAddress } from 'ethers';
import { hexlify } from 'ethers';
import { BrowserProvider } from 'ethers';
import { ethers } from 'ethers';
import { getVotesForProposal, addProposal } from '../utils/firestoreProposals';
import VotersLeaderboard from './VotersLeaderboard';

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
  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null);
  const [symbolLoading, setSymbolLoading] = useState(false);
  // Determine resolved state from on-chain proposal
  const [isOnChainResolved, setIsOnChainResolved] = useState(false);
  // Use on-chain resolved state for status
  const effectiveStatus = isOnChainResolved ? ProposalStatus.Closed : proposal.status;
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  
  // FHE Decryption state
  const [fheDecryptionInstance, setFheDecryptionInstance] = useState<any>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [clientSideDecryptedTallies, setClientSideDecryptedTallies] = useState<{ for: number, against: number, abstain: number } | null>(null);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  const [passedStatus, setPassedStatus] = useState<boolean | null>(null);
  const [totalTokenSupply, setTotalTokenSupply] = useState<number | null>(null);

  const canVote = effectiveStatus === ProposalStatus.Active && !hasUserVoted;
  const canResolve = effectiveStatus === ProposalStatus.Reveal && !revealRequested;

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

  const handleConfidentialVote = async (voteType: number, setVoteStep?: React.Dispatch<React.SetStateAction<'idle' | 'encrypting' | 'casting'>>) => {
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

      // Encrypt only the weight
      const ciphertext = await fhe.createEncryptedInput(contractAddressChecksum, userAddress);
      ciphertext.add64(normalizedBalance);
      const { handles, inputProof } = await ciphertext.encrypt();
      const encryptedHex = hexlify(handles[0]);
      const proofHex = hexlify(inputProof);
      console.log('Submitting vote with:', {
        proposalId: proposal.id,
        encryptedWeight: encryptedHex,
        voteType,
        inputProof: proofHex
      });

      // Set voteStep to 'casting' just before MetaMask pops up
      if (setVoteStep) setVoteStep('casting');
      await writeContractAsync({
        address: contractAddressChecksum,
        abi: DAO_ABI,
        functionName: 'vote',
        args: [proposal.id, encryptedHex, voteType, proofHex],
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
    async function getTalliesAndSupply() {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const tallies = await fetchRevealedTallies(proposal.id, provider);
        setDecryptedTallies({
          for: tallies.for,
          against: tallies.against,
          abstain: tallies.abstain
        });
        setIsOnChainResolved(tallies.resolved);
        // Fetch total token supply from the token contract
        if (proposal.token) {
          const tokenContract = new ethers.Contract(proposal.token, [
            'function totalSupply() view returns (uint256)',
            'function decimals() view returns (uint8)'
          ], provider);
          const supply = await tokenContract.totalSupply();
          const decimals = await tokenContract.decimals();
          const normalizedSupply = Number(ethers.formatUnits(supply, decimals));
          setTotalTokenSupply(normalizedSupply);
          // Calculate quorum and pass/fail
          const quorumRequired = 1; // TODO: Replace with dynamic value if needed
          const forVotes = tallies.for;
          const quorumPercent = (forVotes / normalizedSupply) * 100;
          const passed = tallies.resolved && quorumPercent >= quorumRequired;
          setPassedStatus(passed);
        }
      } catch (err) {
        // handle error
      }
    }
    getTalliesAndSupply();
  }, [proposal.id, proposal.token]);

  // Handler for resolve button
  const handleResolveClick = async () => {
    setIsResolving(true);
    try {
      await onResolve(proposal.id);
      // Update Firestore to mark as resolved
      await addProposal({
        ...proposal,
        status: ProposalStatus.Closed,
        resolved: true
      });
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

  useEffect(() => {
    // Fetch token symbol for the voting token
    const fetchSymbol = async () => {
      if (!proposal.token) {
        setTokenSymbol(null);
        return;
      }
      setSymbolLoading(true);
      try {
        let provider;
        if (window.ethereum) {
          provider = new ethers.BrowserProvider(window.ethereum);
        } else {
          setTokenSymbol(null);
          setSymbolLoading(false);
          return;
        }
        const tokenContract = new ethers.Contract(proposal.token, [
          'function symbol() view returns (string)'
        ], provider);
        const symbol = await tokenContract.symbol();
        setTokenSymbol(symbol);
      } catch (err) {
        setTokenSymbol(null);
      }
      setSymbolLoading(false);
    };
    fetchSymbol();
  }, [proposal.token]);

  // Initialize FHE decryption instance
  useEffect(() => {
    const initializeDecryption = async () => {
      try {
        const fhe = getFheInstance();
        if (fhe && typeof fhe.publicDecrypt === 'function') {
          setFheDecryptionInstance(fhe);
        }
      } catch (error) {
      }
    };
    
    initializeDecryption();
  }, []);

  // Client-side decryption function using decryptValue
  const handleClientSideDecryption = async () => {
    setDecryptionError(null);
    if (!fheDecryptionInstance || !connectedAddress) {
      setDecryptionError('FHE decryption instance or user address not available');
      return;
    }
    setIsDecrypting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(DAO_CONTRACT_ADDRESS, DAO_ABI, provider);
      // Get the encrypted tallies from the contract (as bytes32/hex strings)
      const onChainProposal = await contract.proposals(proposal.id);
      if (!onChainProposal.resolved) {
        setDecryptionError('Proposal not yet resolved on-chain');
        setIsDecrypting(false);
        return;
      }
      // These should be the encrypted handles (hex strings) for the tallies
      const forHandle = onChainProposal.forVotes;
      const againstHandle = onChainProposal.againstVotes;
      const abstainHandle = onChainProposal.abstainVotes;
      // Decrypt each tally using the relayer
      const [forVotes, againstVotes, abstainVotes] = await Promise.all([
        decryptValue(forHandle),
        decryptValue(againstHandle),
        decryptValue(abstainHandle)
      ]);
      setClientSideDecryptedTallies({ for: forVotes, against: againstVotes, abstain: abstainVotes });
    } catch (error: any) {
      setDecryptionError(error.message || 'Client-side decryption failed');
      console.error('Client-side decryption failed:', error);
    } finally {
      setIsDecrypting(false);
    }
  };

  function truncateAddress(address: string) {
    if (!address) return '';
    return address.slice(0, 6) + '...' + address.slice(-4);
  }

  const votesSafe = Array.isArray(votes) ? votes : [];

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
          <StatusBadge status={effectiveStatus} />
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
            {symbolLoading ? (
              <Loader2 className="animate-spin ml-2 text-primary" size={14} />
            ) : tokenSymbol && (
              <span className="ml-2 text-xs font-semibold text-primary">({tokenSymbol})</span>
            )}
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
          status={effectiveStatus}
          votingDeadline={proposal.votingDeadline}
          resolutionDeadline={proposal.resolutionDeadline}
          resolved={decryptedTallies !== null}
        />
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {effectiveStatus === ProposalStatus.Active && (
            <CountdownTimer
              targetDate={proposal.votingDeadline}
              label="Voting ends"
              className="text-primary"
            />
          )}
          {/* Remove the resolution deadline timer/countdown after proposal is resolved */}
          {/*
          {proposal.status === ProposalStatus.Reveal && !decryptedTallies && (
            <CountdownTimer
              targetDate={proposal.resolutionDeadline}
              label="Resolution deadline"
              className="text-warning"
            />
          )}
          */}
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

        {effectiveStatus === ProposalStatus.Active && (
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
        <div className="mt-6 flex justify-end gap-3">
          {/* Client-side Decryption Button */}
          {isProposalResolved && fheDecryptionInstance && (
            <button
              className="px-5 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all duration-300 font-medium shadow-zama hover:shadow-zama-lg flex items-center gap-2"
              onClick={handleClientSideDecryption}
              disabled={isDecrypting}
            >
              {isDecrypting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Unlock size={18} />
              )}
              {isDecrypting ? 'Decrypting...' : 'Client Decrypt'}
            </button>
          )}
          
          <button
            className="px-5 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 transition-all duration-300 font-medium shadow-zama hover:shadow-zama-lg flex items-center gap-2"
            onClick={() => setShowAnalyticsModal(true)}
          >
            <BarChart2 size={18} />
            Analytics
          </button>
        </div>
      </div>

      {/* Analytics Modal */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-card-dark rounded-2xl p-8 max-w-2xl w-full relative shadow-lg">
            <button
              className="absolute top-4 right-4 text-xl text-gray-400 hover:text-accent"
              onClick={() => setShowAnalyticsModal(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <VotersLeaderboard votes={votesSafe} />
          </div>
        </div>
      )}

      {/* Results */}
      {(isProposalResolved || totalVotes > 0) && (
        <div className="bg-white/90 dark:bg-card-dark/90 backdrop-blur-sm border border-zama-light-orange dark:border-border-dark rounded-2xl p-8 shadow-zama">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-accent dark:text-text-primary-dark">Results</h2>
            <div className="flex items-center gap-3">
              {isOnChainResolved && passedStatus !== null && (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
                  passedStatus
                    ? 'bg-success/10 text-success border border-success/30'
                    : 'bg-danger/10 text-danger border border-danger/30'
                }`}>
                  {passedStatus ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  {passedStatus ? 'Passed' : 'Not Passed'}
                </div>
              )}
              {decryptedTallies && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary/10 text-primary border border-primary/30">
                  <Unlock size={16} />
                  On-Chain Decrypted
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-6 bg-success/5 dark:bg-success/10 rounded-xl">
              <div className="flex items-center gap-3">
                <ThumbsUp className="text-success" size={24} />
                <span className="font-medium text-accent dark:text-text-primary-dark text-lg">For</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-success">
                  {decryptedTallies?.for?.toLocaleString() ?? <span className="text-success">Decrypting...</span>}
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
                  {decryptedTallies?.against?.toLocaleString() ?? <span className="text-danger">Decrypting...</span>}
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
                  {decryptedTallies?.abstain?.toLocaleString() ?? <span className="text-abstain">Decrypting...</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client-side Decrypted Results */}
      {clientSideDecryptedTallies && (
        <div className="bg-white/90 dark:bg-card-dark/90 backdrop-blur-sm border border-primary/30 dark:border-primary/30 rounded-2xl p-8 shadow-zama">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-accent dark:text-text-primary-dark flex items-center gap-2">
              <Unlock size={20} className="text-primary" />
              Client-Side Decrypted Results
            </h2>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary/10 text-primary border border-primary/30">
              <Shield size={16} />
              Local Verification
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-6 bg-success/5 dark:bg-success/10 rounded-xl">
              <div className="flex items-center gap-3">
                <ThumbsUp className="text-success" size={24} />
                <span className="font-medium text-accent dark:text-text-primary-dark text-lg">For</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-success">
                  {clientSideDecryptedTallies.for?.toLocaleString() ?? '0'}
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
                  {clientSideDecryptedTallies.against?.toLocaleString() ?? '0'}
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
                  {clientSideDecryptedTallies.abstain?.toLocaleString() ?? '0'}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <div className="flex items-start gap-3">
              <Shield className="text-primary flex-shrink-0 mt-1" size={20} />
              <div>
                <h4 className="font-medium text-primary mb-2">Client-Side Verification</h4>
                <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
                  These results were decrypted locally in your browser using FHE. This provides additional verification 
                  that the on-chain results are correct and haven't been tampered with.
                </p>
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
      {decryptionError && (
        <div className="mt-4 p-3 bg-danger/10 text-danger border border-danger/30 rounded-xl">
          <span className="font-medium">{decryptionError}</span>
        </div>
      )}
    </div>
  );
};

export default ProposalDetails;