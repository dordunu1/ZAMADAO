import React, { useState } from 'react';
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
import { getDaoContractConfig, DAO_CONTRACT_ADDRESS, DAO_ABI } from './utils/daoContract';
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

  const handleCreateProposal = async (title: string, description: string, votingDeadline: number, tokenAddress: string) => {
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

  const handleCastVote = async (voteType: VoteType, weight: number) => {
    if (!selectedProposalId) {
      console.log('No selectedProposalId!');
      return;
    }
    const voteObj = {
      voter: connectedAddress || '',
      type: voteType === VoteType.For ? 'for' : voteType === VoteType.Against ? 'against' : 'abstain',
      timestamp: Date.now(),
    };
    console.log('Writing vote for proposal:', selectedProposalId, 'vote:', voteObj);
    await addVote(selectedProposalId, voteObj);
    setProposals(prev => prev.map(p => 
      p.id === selectedProposalId 
        ? { 
            ...p, 
            totalVotes: p.totalVotes + 1,
            confidentialVotes: p.confidentialVotes + 1
          }
        : p
    ));
    setUserVotes(prev => ({
      ...prev,
      [selectedProposalId]: true
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
            onBack={() => setSelectedProposalId(null)}
            onShare={handleShareProposal}
            onCastVote={handleCastVote}
            onResolve={handleResolveProposal}
            userVoted={userVotes[selectedProposal.id] || false}
          />
        ) : (
          <Dashboard
            proposals={proposals}
            onCreateProposal={handleCreateProposal}
            onViewProposal={setSelectedProposalId}
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