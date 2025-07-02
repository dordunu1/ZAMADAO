import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, addDoc, Timestamp } from 'firebase/firestore';

// Proposal type
export interface Proposal {
  id: number;
  title: string;
  description: string;
  creator: string;
  createdAt: number;
  votingDeadline: number;
  resolutionDeadline: number;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  resolved: boolean;
  passed: boolean;
  status: string;
  totalVotes: number;
  confidentialVotes: number;
}

// Vote type
export interface Vote {
  voter: string;
  type: 'for' | 'against' | 'abstain';
  timestamp: number;
}

// Add a new proposal (ID must be provided and unique)
export async function addProposal(proposal: Proposal) {
  const proposalRef = doc(db, 'proposals', proposal.id.toString());
  await setDoc(proposalRef, proposal);
}

// Get all proposals
export async function getProposals(): Promise<Proposal[]> {
  const proposalsCol = collection(db, 'proposals');
  const snapshot = await getDocs(proposalsCol);
  return snapshot.docs
    .map(doc => doc.data() as Proposal)
    .filter(p => !String(p.id).startsWith('pending-'));
}

// Add a vote to a proposal (proposalId: number)
export async function addVote(proposalId: number, vote: Vote) {
  const votesCol = collection(db, 'proposals', proposalId.toString(), 'votes');
  await addDoc(votesCol, vote);
}

// Get all votes for a proposal
export async function getVotesForProposal(proposalId: number): Promise<Vote[]> {
  const votesCol = collection(db, 'proposals', proposalId.toString(), 'votes');
  const snapshot = await getDocs(votesCol);
  return snapshot.docs.map(doc => doc.data() as Vote);
} 