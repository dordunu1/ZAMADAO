import daoAbi from '../abi/ConfidentialDAO.json';
import { ethers } from 'ethers';
import { addProposal, getProposals } from './firestoreProposals';
import type { Proposal as FirestoreProposal } from './firestoreProposals';

export const DAO_CONTRACT_ADDRESS = import.meta.env.VITE_DAO_CONTRACT_ADDRESS as `0x${string}`;
export const DAO_ABI = daoAbi.abi;

// Returns a config object for Wagmi's useContractRead/useContractWrite
export function getDaoContractConfig() {
  return {
    address: DAO_CONTRACT_ADDRESS,
    abi: DAO_ABI,
  };
}

/**
 * Fetch the number of proposals from the contract.
 * @param provider ethers.Signer | ethers.Provider | any
 */
export async function fetchProposalCount(provider: any) {
  const contract = new ethers.Contract(DAO_CONTRACT_ADDRESS, DAO_ABI, provider);
  // proposals is a public array, so .length is available
  const count = await contract.proposals.length;
  return Number(count);
}

/**
 * Fetch a single proposal by ID from the contract.
 * @param id Proposal ID (index)
 * @param provider ethers.Signer | ethers.Provider | any
 */
export async function fetchProposalById(id: number, provider: any) {
  const contract = new ethers.Contract(DAO_CONTRACT_ADDRESS, DAO_ABI, provider);
  const proposal = await contract.proposals(id);
  return { id, ...proposal };
}

/**
 * Fetch all proposals from the contract.
 * @param provider ethers.Signer | ethers.Provider | any
 */
export async function fetchAllProposals(provider: any) {
  const count = await fetchProposalCount(provider);
  const proposals = [];
  for (let i = 0; i < count; i++) {
    const proposal = await fetchProposalById(i, provider);
    proposals.push(proposal);
  }
  return proposals;
}

/**
 * Check if a reveal has been requested for a proposal.
 * @param id Proposal ID (index)
 * @param provider ethers.Signer | ethers.Provider | any
 */
export async function isRevealRequested(id: number, provider: any) {
  const contract = new ethers.Contract(DAO_CONTRACT_ADDRESS, DAO_ABI, provider);
  return await contract.isRevealRequested(id);
}

/**
 * Check if a user has voted on a proposal.
 * @param id Proposal ID (index)
 * @param userAddress address
 * @param provider ethers.Signer | ethers.Provider | any
 */
export async function hasVoted(id: number, userAddress: string, provider: any) {
  const contract = new ethers.Contract(DAO_CONTRACT_ADDRESS, DAO_ABI, provider);
  return await contract.hasVoted(id, userAddress);
}

// Remove syncProposalsToFirestore and syncProposalsFromEvents logic
// ... existing code ... 