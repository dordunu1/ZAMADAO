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
    mapping(uint256 => bool) public callbackHasBeenCalled;
    mapping(uint256 => uint256) internal proposalIndexByRequestId; // Map decryptionRequestId to proposal index

    event ProposalCreated(uint256 indexed proposalId, address indexed creator, address token, uint256 endTime);
    event Voted(uint256 indexed proposalId, address indexed voter);
    event ProposalResolved(uint256 indexed proposalId, uint64 forVotes, uint64 againstVotes, uint64 abstainVotes);
    event TallyRevealRequested(uint256 indexed proposalId, uint256 requestId);
    event DebugCallbackStep(string step, uint256 proposalId);
    event CallbackFlagSet(uint256 proposalId);

    address public owner;
    uint256 public proposalFee = 0.002 ether;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setProposalFee(uint256 newFee) external onlyOwner {
        proposalFee = newFee;
    }

    function withdrawFees() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    // Create a new proposal
    function createProposal(address token, uint256 durationSeconds) external payable {
        require(msg.value >= proposalFee, "Insufficient proposal fee");
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
        externalEuint64 encryptedWeight,
        uint8 voteType,
        bytes calldata inputProof
    ) external {
        require(proposalId < proposals.length, "Invalid proposal");
        Proposal storage prop = proposals[proposalId];
        require(block.timestamp < prop.endTime, "Voting ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        require(IERC20(prop.token).balanceOf(msg.sender) > 0, "Not a token holder");

        euint64 weight = FHE.fromExternal(encryptedWeight, inputProof);
        euint64 zero = FHE.asEuint64(0);
        ebool isFor = FHE.eq(FHE.asEuint64(voteType), FHE.asEuint64(1));
        ebool isAgainst = FHE.eq(FHE.asEuint64(voteType), FHE.asEuint64(0));
        ebool isAbstain = FHE.eq(FHE.asEuint64(voteType), FHE.asEuint64(2));

        prop.forVotes = FHE.add(prop.forVotes, FHE.select(isFor, weight, zero));
        prop.againstVotes = FHE.add(prop.againstVotes, FHE.select(isAgainst, weight, zero));
        prop.abstainVotes = FHE.add(prop.abstainVotes, FHE.select(isAbstain, weight, zero));

        FHE.allowThis(prop.forVotes);
        FHE.allowThis(prop.againstVotes);
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
        proposalIndexByRequestId[requestId] = proposalId; // Map requestId to proposalId
        emit TallyRevealRequested(proposalId, requestId);
    }

    // Callback for decryption oracle (FHEVM 0.8.0 format - ERC-7995 compliant)
    function resolveTallyCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        emit DebugCallbackStep("callback_entered", 0);
        
        // Verify signatures against the request and provided cleartexts
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);
        
        uint256 proposalId = proposalIndexByRequestId[requestId];
        emit DebugCallbackStep("proposal_found", proposalId);
        
        // Decode the cleartexts back into uint64 values [revealedFor, revealedAgainst, revealedAbstain]
        (uint64 revealedFor, uint64 revealedAgainst, uint64 revealedAbstain) = abi.decode(cleartexts, (uint64, uint64, uint64));
        
        Proposal storage prop = proposals[proposalId];
        prop.revealedFor = revealedFor;
        prop.revealedAgainst = revealedAgainst;
        prop.revealedAbstain = revealedAbstain;
        prop.resolved = true;
        callbackHasBeenCalled[proposalId] = true;
        emit CallbackFlagSet(proposalId);
        emit ProposalResolved(proposalId, revealedFor, revealedAgainst, revealedAbstain);
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

    // Check if callback has been called for a proposal (for testing)
    function isCallbackCalled(uint256 proposalId) external view returns (bool) {
        require(proposalId < proposals.length, "Invalid proposal");
        return callbackHasBeenCalled[proposalId];
    }
} 