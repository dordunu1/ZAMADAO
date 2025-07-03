import React, { useState, useEffect } from 'react';
import { Gavel, Copy, CheckCircle } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ProposalDetails from './components/ProposalDetails';
import ThemeToggle from './components/ThemeToggle';
import { Proposal, VoteType, ProposalStatus } from './types/proposal';
import { getProposalStatus } from './utils/time';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { addProposal, getProposals, addVote } from './utils/firestoreProposals';
import { useAccount } from 'wagmi';
import { useWriteContract } from 'wagmi';
import { getDaoContractConfig, DAO_CONTRACT_ADDRESS, DAO_ABI, claimZamaDaoTokens, getClaimedAmount, ZAMADAO_TOKEN_ADDRESS } from './utils/daoContract';
import { initializeFheInstance } from './utils/fheInstance';
import { ethers } from 'ethers';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

function App() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposalId, setSelectedProposalId] = useState<number | null>(null);
  const [userVotes, setUserVotes] = useState<Record<number, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string>('');
  const { address: connectedAddress } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimed, setClaimed] = useState<bigint>(0n);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const selectedProposal = proposals.find(p => p.id === selectedProposalId);

  React.useEffect(() => {
    // Initialize FHE instance on app startup
    initializeFheInstance();
    // Fetch proposals from Firestore on mount
    getProposals().then((data) => {
      setProposals(
        data.map((p) => ({
          ...(p as Proposal),
          status: ProposalStatus[p.status as keyof typeof ProposalStatus] || ProposalStatus.Active,
          token: (p as any).token || '',
        }))
      );
    });
  }, []);

  React.useEffect(() => {
    if (!connectedAddress || !window.ethereum) {
      setClaimed(0n);
      return;
    }
    const fetchClaimed = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const claimedAmount = await getClaimedAmount(connectedAddress, provider);
        setClaimed(BigInt(claimedAmount));
      } catch (e) {
        setClaimed(0n);
      }
    };
    fetchClaimed();
  }, [connectedAddress]);

  // On mount, set selectedProposalId from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const proposalParam = params.get('proposal');
    if (proposalParam !== null) {
      setSelectedProposalId(Number(proposalParam));
    }
  }, []);

  const handleCreateProposal = async (title: string, description: string, votingDeadline: number, tokenAddress: string, quorum: number) => {
    const now = Date.now();
    const RESOLUTION_PHASE_DURATION = 1 * 24 * 60 * 60 * 1000; // 1 day after voting ends
    const tempId = 'pending-' + now;
    const optimisticProposal: Proposal = {
      id: tempId as any, // Firestore expects string, but Proposal type expects number; cast for now
      title,
      description,
      creator: connectedAddress || '',
      createdAt: now,
      votingDeadline,
      resolutionDeadline: votingDeadline + RESOLUTION_PHASE_DURATION,
      forVotes: 0,
      againstVotes: 0,
      abstainVotes: 0,
      resolved: false,
      passed: false,
      status: 'pending' as any, // Mark as pending
      totalVotes: 0,
      confidentialVotes: 0,
      token: tokenAddress,
      quorum,
    };
    await addProposal(optimisticProposal);
    setProposals(prev => [
      optimisticProposal,
      ...prev
    ]);
    showToast('Proposal submitted (pending confirmation)...');

    // Send the transaction
    const durationSeconds = Math.floor((votingDeadline - now) / 1000);
    const txHash = await writeContractAsync({
      address: DAO_CONTRACT_ADDRESS,
      abi: DAO_ABI,
      functionName: 'createProposal',
      args: [tokenAddress, durationSeconds],
      value: ethers.parseEther('0.2'), // Proposal fee, should match contract
    });

    // In the background, poll for the transaction receipt and update Firestore with the real proposalId
    (async () => {
      let proposalId = null;
      if (txHash) {
        const provider = window.ethereum
          ? new ethers.BrowserProvider(window.ethereum)
          : ethers.getDefaultProvider();
        let receipt = null;
        // Poll for receipt
        while (!receipt) {
          receipt = await provider.getTransactionReceipt(txHash);
          if (!receipt) await new Promise(res => setTimeout(res, 3000));
        }
        if (receipt && receipt.logs) {
          const iface = new ethers.Interface(DAO_ABI);
          for (const log of receipt.logs) {
            let parsed = null;
            try {
              parsed = iface.parseLog(log);
            } catch (e) {}
            if (
              parsed &&
              parsed.name === 'ProposalCreated' &&
              parsed.args &&
              parsed.args.proposalId !== undefined
            ) {
              proposalId = parsed.args.proposalId.toNumber ? parsed.args.proposalId.toNumber() : Number(parsed.args.proposalId);
              break;
            }
          }
        }
      }
      if (proposalId !== null) {
        // Update Firestore: set id = proposalId, status = 'confirmed'
        const confirmedProposal: Proposal = {
          ...optimisticProposal,
          id: proposalId,
          status: ProposalStatus.Active,
          quorum,
        };
        await addProposal(confirmedProposal);
        // Delete the pending proposal from Firestore
        await deleteDoc(doc(db, 'proposals', String(tempId)));
        setProposals(prev => [
          confirmedProposal,
          ...prev.filter(p => String(p.id) !== String(tempId))
    ]);
    showToast('Proposal created successfully!');
      } else {
        showToast('Failed to get proposal ID from event');
      }
    })();
  };

  const handleShareProposal = (id: number) => {
    const url = `${window.location.origin}/?proposal=${id}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast('Proposal link copied to clipboard!');
    });
  };

  const handleCastVote = async (proposalId: number, voteType: VoteType, votingPower: number) => {
    if (proposalId === undefined || proposalId === null) {
      console.log('No proposalId!');
      return;
    }
    let type: 'for' | 'against' | 'abstain';
    if (voteType === VoteType.For) type = 'for';
    else if (voteType === VoteType.Against) type = 'against';
    else type = 'abstain';
    const voteObj = {
      voter: connectedAddress || '',
      type,
      timestamp: Date.now(),
      votingPower: votingPower,
    };
    console.log('Writing vote for proposal:', proposalId, 'vote:', voteObj);
    await addVote(proposalId, voteObj);
    setProposals(prev => prev.map(p => 
      p.id === proposalId 
        ? { 
            ...p, 
            totalVotes: p.totalVotes + 1,
            confidentialVotes: p.confidentialVotes + 1
          }
        : p
    ));
    setUserVotes(prev => ({
      ...prev,
      [proposalId]: true
    }));
    showToast('Confidential vote cast successfully!');
  };

  const handleResolveProposal = async (id: number) => {
    // Call the contract to request tally reveal
    await writeContractAsync({
      address: DAO_CONTRACT_ADDRESS,
      abi: DAO_ABI,
      functionName: 'requestTallyReveal',
      args: [id],
    });
    setProposals(prev => prev.map(p => {
      if (p.id === id) {
        // Simulate vote tallying for resolved proposals
        const totalVotes = p.totalVotes || 15;
        const forVotes = Math.floor(totalVotes * 0.6);
        const againstVotes = Math.floor(totalVotes * 0.3);
        const abstainVotes = totalVotes - forVotes - againstVotes;
        const passed = forVotes > againstVotes;
        return {
          ...p,
          resolved: true,
          passed,
          status: ProposalStatus.Closed,
          forVotes,
          againstVotes,
          abstainVotes
        };
      }
      return p;
    }));
    showToast('Proposal resolved successfully!');
  };

  const handleClaim = async () => {
    if (!connectedAddress || !window.ethereum) return;
    setClaimLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tx = await claimZamaDaoTokens(signer);
      await tx.wait();
      showToast('Successfully claimed 30 ZAMADAO tokens!');
      setClaimed(30n * 10n ** 18n);
    } catch (e: any) {
      showToast(e?.reason || e?.message || 'Claim failed');
    }
    setClaimLoading(false);
  };

  // Update proposal statuses based on current time
  React.useEffect(() => {
    const interval = setInterval(() => {
      setProposals(prev => prev.map(proposal => ({
        ...proposal,
        status: getProposalStatus(
          proposal.votingDeadline,
          proposal.resolutionDeadline,
          proposal.resolved
        ) as ProposalStatus
      })));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // When a proposal is selected, update the URL
  const handleViewProposal = (id: number) => {
    setSelectedProposalId(id);
    const params = new URLSearchParams(window.location.search);
    params.set('proposal', id.toString());
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-zama-gradient dark:bg-zama-gradient-dark transition-all duration-300">
      {/* Header */}
      <header className="bg-white/80 dark:bg-card-dark/80 backdrop-blur-sm border-b border-zama-light-orange dark:border-border-dark sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-xl shadow-zama">
                <Gavel className="text-accent dark:text-primary" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-accent dark:text-text-primary-dark">ZAMA DAO</h1>
                <p className="text-xs text-text-secondary dark:text-text-secondary-dark">Confidential Governance</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <button
                className="px-4 py-2 rounded-lg font-bold bg-yellow-400 text-black shadow hover:bg-yellow-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={!connectedAddress || claimLoading || claimed >= 30n * 10n ** 18n}
                onClick={handleClaim}
              >
                {claimLoading ? 'Claiming...' : claimed >= 30n * 10n ** 18n ? 'Claimed' : 'Claim ZAMADAO'}
              </button>
              <ConnectButton showBalance={false} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedProposal ? (
          <ProposalDetails
            proposal={selectedProposal}
            onBack={() => {
              setSelectedProposalId(null);
              const params = new URLSearchParams(window.location.search);
              params.delete('proposal');
              window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`);
            }}
            onShare={handleShareProposal}
            onCastVote={(voteType, votingPower) => handleCastVote(selectedProposal.id, voteType, votingPower)}
            onResolve={handleResolveProposal}
            userVoted={userVotes[selectedProposal.id] || false}
          />
        ) : (
          <Dashboard
            proposals={proposals}
            onCreateProposal={handleCreateProposal as any}
            onViewProposal={handleViewProposal}
            onShareProposal={handleShareProposal}
          />
        )}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-white/90 dark:bg-card-dark/90 backdrop-blur-sm border border-zama-light-orange dark:border-border-dark rounded-xl shadow-zama-lg p-4 animate-slide-up z-50">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-success flex-shrink-0" size={20} />
            <p className="text-sm font-medium text-accent dark:text-text-primary-dark">{toastMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;