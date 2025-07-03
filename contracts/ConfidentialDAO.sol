// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, externalEuint64, euint64, ebool } from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ConfidentialDAO is SepoliaConfig {
    struct Proposal {
        address creator;
        address token;
        uint256 endTime;
        euint64 forVotes;
        euint64 againstVotes;
        euint64 abstainVotes;
        bool resolved;
        uint64 revealedFor;
        uint64 revealedAgainst;
        uint64 revealedAbstain;
        uint256 decryptionRequestId;
    }

    Proposal[] public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(uint256 indexed proposalId, address indexed creator, address token, uint256 endTime);
    event Voted(uint256 indexed proposalId, address indexed voter);
    event ProposalResolved(uint256 indexed proposalId, uint64 forVotes, uint64 againstVotes, uint64 abstainVotes);
    event TallyRevealRequested(uint256 indexed proposalId, uint256 requestId);

    // Create a new proposal
    function createProposal(address token, uint256 durationSeconds) external {
        require(durationSeconds > 0, "Duration must be positive");
        Proposal memory newProp = Proposal({
            creator: msg.sender,
            token: token,
            endTime: block.timestamp + durationSeconds,
            forVotes: FHE.asEuint64(0),
            againstVotes: FHE.asEuint64(0),
            abstainVotes: FHE.asEuint64(0),
            resolved: false,
            revealedFor: 0,
            revealedAgainst: 0,
            revealedAbstain: 0,
            decryptionRequestId: 0
        });
        proposals.push(newProp);
        emit ProposalCreated(proposals.length - 1, msg.sender, token, newProp.endTime);
    }

    // Vote on a proposal (0 = against, 1 = for, 2 = abstain)
    function vote(
        uint256 proposalId,
        externalEuint64 encryptedVote,
        bytes calldata inputProof
    ) external {
        require(proposalId < proposals.length, "Invalid proposal");
        Proposal storage prop = proposals[proposalId];
        require(block.timestamp < prop.endTime, "Voting ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        require(IERC20(prop.token).balanceOf(msg.sender) > 0, "Not a token holder");

        euint64 voteValue = FHE.fromExternal(encryptedVote, inputProof);

        // FHE branching to increment the correct tally
        ebool isFor = FHE.eq(voteValue, FHE.asEuint64(1));
        ebool isAgainst = FHE.eq(voteValue, FHE.asEuint64(0));
        ebool isAbstain = FHE.eq(voteValue, FHE.asEuint64(2));

        prop.forVotes = FHE.add(prop.forVotes, FHE.select(isFor, voteValue, FHE.asEuint64(0)));
        FHE.allowThis(prop.forVotes);

        prop.againstVotes = FHE.add(prop.againstVotes, FHE.select(isAgainst, voteValue, FHE.asEuint64(0)));
        FHE.allowThis(prop.againstVotes);

        prop.abstainVotes = FHE.add(prop.abstainVotes, FHE.select(isAbstain, voteValue, FHE.asEuint64(0)));
        FHE.allowThis(prop.abstainVotes);

        hasVoted[proposalId][msg.sender] = true;
        emit Voted(proposalId, msg.sender);
    }

    // Request decryption of tallies after voting ends
    function requestTallyReveal(uint256 proposalId) external {
        require(proposalId < proposals.length, "Invalid proposal");
        Proposal storage prop = proposals[proposalId];
        require(block.timestamp >= prop.endTime, "Voting not ended");
        require(!prop.resolved, "Already resolved");
        require(msg.sender == prop.creator, "Only creator can request reveal");

        bytes32[] memory cts = new bytes32[](3);
        cts[0] = FHE.toBytes32(prop.forVotes);
        cts[1] = FHE.toBytes32(prop.againstVotes);
        cts[2] = FHE.toBytes32(prop.abstainVotes);

        uint256 requestId = FHE.requestDecryption(cts, this.resolveTallyCallback.selector);
        prop.decryptionRequestId = requestId;
        emit TallyRevealRequested(proposalId, requestId);
    }

    // Callback for decryption oracle
    function resolveTallyCallback(
        uint256 requestId,
        uint64 revealedFor,
        uint64 revealedAgainst,
        uint64 revealedAbstain,
        bytes[] memory signatures
    ) external {
        // In production, check msg.sender is the FHEVM gateway
        FHE.checkSignatures(requestId, signatures);
        for (uint256 i = 0; i < proposals.length; i++) {
            if (proposals[i].decryptionRequestId == requestId) {
                proposals[i].revealedFor = revealedFor;
                proposals[i].revealedAgainst = revealedAgainst;
                proposals[i].revealedAbstain = revealedAbstain;
                proposals[i].resolved = true;
                emit ProposalResolved(i, revealedFor, revealedAgainst, revealedAbstain);
                break;
            }
        }
    }

    // Get proposal info (returns revealed tallies if resolved, otherwise 0)
    function getProposal(uint256 proposalId) external view returns (
        address creator,
        address token,
        uint256 endTime,
        bool resolved,
        uint64 forVotes,
        uint64 againstVotes,
        uint64 abstainVotes
    ) {
        require(proposalId < proposals.length, "Invalid proposal");
        Proposal storage prop = proposals[proposalId];
        return (
            prop.creator,
            prop.token,
            prop.endTime,
            prop.resolved,
            prop.resolved ? prop.revealedFor : 0,
            prop.resolved ? prop.revealedAgainst : 0,
            prop.resolved ? prop.revealedAbstain : 0
        );
    }

    // Get decryption request ID for a proposal
    function getDecryptionRequestId(uint256 proposalId) external view returns (uint256) {
        require(proposalId < proposals.length, "Invalid proposal");
        return proposals[proposalId].decryptionRequestId;
    }

    // Get reveal status for a proposal
    function getRevealStatus(uint256 proposalId) external view returns (
        bool resolved,
        uint64 revealedFor,
        uint64 revealedAgainst,
        uint64 revealedAbstain,
        uint256 decryptionRequestId
    ) {
        require(proposalId < proposals.length, "Invalid proposal");
        Proposal storage prop = proposals[proposalId];
        return (
            prop.resolved,
            prop.revealedFor,
            prop.revealedAgainst,
            prop.revealedAbstain,
            prop.decryptionRequestId
        );
    }

    // Check if a reveal has been requested for a proposal
    function isRevealRequested(uint256 proposalId) external view returns (bool) {
        require(proposalId < proposals.length, "Invalid proposal");
        return proposals[proposalId].decryptionRequestId != 0;
    }
} 