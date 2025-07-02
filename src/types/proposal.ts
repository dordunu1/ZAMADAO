export enum VoteType {
  For = 0,
  Against = 1,
  Abstain = 2
}

export enum ProposalStatus {
  Active = 'VOTING',
  Reveal = 'WAITING_RESOLUTION', 
  Closed = 'RESOLVED'
}

export interface Proposal {
  id: number;
  title: string;
  description: string;
  creator: string;
  createdAt: number;
  votingDeadline: number; // Changed from commitDeadline
  resolutionDeadline: number; // Changed from revealDeadline
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  resolved: boolean;
  passed: boolean;
  status: ProposalStatus;
  totalVotes: number; // Changed from totalCommits/totalReveals
  confidentialVotes: number; // New field for confidential votes
  token: string; // Token address required to vote
}

export interface Vote {
  proposalId: number;
  voter: string;
  voteType: VoteType;
  weight: number;
  encrypted: boolean; // New field for confidential voting
  timestamp: number;
}

export interface ConfidentialVoteData {
  proposalId: number;
  voteType: VoteType;
  weight: number;
  voter: string;
  encrypted: boolean;
  proof: string; // ZK proof for confidential voting
}