import { Proposal, ProposalStatus, Vote, VoteType } from '../types/proposal';
import { getProposalStatus } from '../utils/time';

const now = Date.now();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const mockProposals: Proposal[] = [
  {
    id: 1,
    title: 'Treasury Allocation for Q1 2025 Development',
    description: `# Proposal Summary
    
This proposal requests approval for allocating 500,000 tokens from the DAO treasury to fund development initiatives for Q1 2025.

## Key Initiatives
- Smart contract security audits
- Mobile application development  
- Community growth programs
- Infrastructure improvements

## Budget Breakdown
- Development: 300,000 tokens (60%)
- Security: 100,000 tokens (20%)
- Marketing: 75,000 tokens (15%)
- Operations: 25,000 tokens (5%)

The requested funds will enable us to deliver critical improvements and expand our ecosystem reach.`,
    creator: '0x1234...5678',
    createdAt: now - 3 * DAY,
    votingDeadline: now + 1 * DAY,
    resolutionDeadline: now + 2 * DAY,
    forVotes: 0,
    againstVotes: 0,
    abstainVotes: 0,
    resolved: false,
    passed: false,
    status: ProposalStatus.Active,
    totalVotes: 12,
    confidentialVotes: 12
  },
  {
    id: 2,
    title: 'Protocol Upgrade to v2.0',
    description: `# Protocol Upgrade Proposal

This proposal outlines the migration to Protocol v2.0 with enhanced features and improved security.

## New Features
- Multi-signature wallet integration
- Advanced governance mechanisms
- Improved token economics
- Enhanced user interface

## Timeline
- Development: 2 months
- Testing: 1 month  
- Deployment: 2 weeks

The upgrade will position us for long-term growth and improved user experience.`,
    creator: '0xabcd...ef01',
    createdAt: now - 5 * DAY,
    votingDeadline: now - 1 * DAY,
    resolutionDeadline: now + 6 * HOUR,
    forVotes: 0,
    againstVotes: 0,
    abstainVotes: 0,
    resolved: false,
    passed: false,
    status: ProposalStatus.Reveal,
    totalVotes: 8,
    confidentialVotes: 8
  },
  {
    id: 3,
    title: 'Community Grants Program Launch',
    description: `# Community Grants Program

Establish a grants program to support community-driven projects and initiatives.

## Program Details
- Total allocation: 1,000,000 tokens
- Grant size: 10,000 - 100,000 tokens per project
- Focus areas: DeFi tools, educational content, integrations
- Application process: Monthly review cycles

This program will foster innovation and expand our ecosystem through community contributions.`,
    creator: '0x9876...5432',
    createdAt: now - 7 * DAY,
    votingDeadline: now - 3 * DAY,
    resolutionDeadline: now - 2 * DAY,
    forVotes: 145000,
    againstVotes: 32000,
    abstainVotes: 8000,
    resolved: true,
    passed: true,
    status: ProposalStatus.Closed,
    totalVotes: 15,
    confidentialVotes: 15
  }
];

// Update status based on current time
mockProposals.forEach(proposal => {
  proposal.status = getProposalStatus(
    proposal.votingDeadline,
    proposal.resolutionDeadline,
    proposal.resolved
  ) as ProposalStatus;
});

export const mockVotes: Vote[] = [
  {
    proposalId: 3,
    voter: '0x1111...1111',
    voteType: VoteType.For,
    weight: 50000,
    encrypted: true,
    timestamp: now - 4 * DAY
  },
  {
    proposalId: 3,
    voter: '0x2222...2222',
    voteType: VoteType.For,
    weight: 35000,
    encrypted: true,
    timestamp: now - 4 * DAY
  },
  {
    proposalId: 3,
    voter: '0x3333...3333',
    voteType: VoteType.Against,
    weight: 32000,
    encrypted: true,
    timestamp: now - 4 * DAY
  }
];