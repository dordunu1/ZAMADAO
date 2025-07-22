# Confidential DAO

> **Private, Verifiable, and Secure On-Chain Governance powered by ZAMA FHE**

[Live Demo](https://zamadao.netlify.app/)

---

## Overview
Confidential DAO is a next-generation decentralized governance platform designed to bring true privacy to on-chain voting. Unlike traditional DAO voting systems, where all votes are public and traceable, Confidential DAO leverages Fully Homomorphic Encryption (FHE) to ensure that every vote remains confidential until the tally is revealed. This approach protects voter privacy, prevents vote buying/coercion, and enables more honest governance.

- **Privacy by Design:** Votes are encrypted and never revealed individually, only the final tally is decrypted.
- **Trustless & Decentralized:** Built on Ethereum, using smart contracts and cryptographic proofs.
- **Solves Real Problems:** Addresses the transparency paradox in DAOs—where transparency can undermine true democracy by exposing voters to social or economic pressure.

Confidential DAO empowers communities to govern themselves without sacrificing privacy or security.

---

## Motivation: Problems with Traditional DAO Voting
- All votes are public and traceable on-chain.
- Voters can be pressured, bribed, or retaliated against based on their choices.
- Public votes make it easy for malicious actors to buy votes or coerce participants.
- Voters may not vote honestly if they fear social or reputational consequences.
- Privacy concerns can discourage users from participating in governance.

**Confidential DAO addresses these issues by making votes private by default.**

---

## The Confidential DAO Solution
Confidential DAO leverages advanced cryptography—specifically Fully Homomorphic Encryption (FHE)—to solve the privacy and security issues inherent in traditional DAO voting.

- **FHE Basics:** Fully Homomorphic Encryption allows computations to be performed directly on encrypted data. In Confidential DAO, this means votes are encrypted in the browser and remain encrypted throughout the voting and tallying process.
- **On-chain Tallying:** The smart contract uses FHE operations to add encrypted votes together, producing an encrypted tally. At no point are individual votes decrypted or exposed.
- **Decryption Oracle:** After voting ends, the contract requests an off-chain oracle (e.g., Zama FHEVM gateway) to decrypt the final tally. The oracle returns the plaintext result, which is then published on-chain.

**Only the final tally is ever revealed; individual votes remain private forever.**

---

## Key Features
- **Private Voting:** Your vote is encrypted and never revealed individually.
- **On-Chain Security:** All logic is enforced by smart contracts, with no trusted third parties.
- **Open & Inclusive:** Anyone can propose, vote, and participate—without fear of coercion or surveillance.
- **Verifiable Results:** Anyone can verify the tally and contract logic on-chain.
- **Token Gating:** Proposals specify the governance token; only holders can vote.

---

## Architecture Overview
- **Smart Contract:** Manages proposals, voting, and tally reveals using FHE. Prevents double voting and ensures only token holders can vote.
- **FHE Cryptography:** Votes are encrypted in the browser, tallied on-chain, and only the final tally is decrypted by an oracle.
- **Frontend (React):** Users connect wallets, create proposals, vote privately, and view results. Uses ethers.js/web3.js and FHE libraries.
- **Off-chain Storage:** Firebase is used for proposal metadata and notifications.

---

## Usage Guide
1. **Connect Your Wallet:** Open the app and connect via MetaMask or WalletConnect.
2. **Create a Proposal:** Enter details, select governance token, set duration, and pay the fee.
3. **Vote Privately:** Select a proposal, choose your vote (For, Against, Abstain). Vote is encrypted and sent with a proof to the contract.
4. **Reveal the Tally:** After voting ends, the proposal creator requests the tally reveal. The oracle decrypts and publishes the result.
5. **View Results:** Final tally is displayed; individual votes remain private.

For troubleshooting and more details, see the in-app help or documentation.

---

## Roadmap
- **Multi-token support:** Allow proposals to use multiple governance tokens.
- **Enhanced privacy:** Research and integrate additional privacy-preserving technologies.
- **DAO analytics:** Dashboards and analytics for governance insights.
- **Community governance:** Decentralize protocol upgrades and feature development.

---

## FAQ (Selected)
**Q: How is my vote kept private?**
A: Votes are encrypted using FHE before being sent to the blockchain. Only the final tally is decrypted, never individual votes.

**Q: Can the contract owner or anyone else see my vote?**
A: No. The contract and all parties only see encrypted data. Only the final tally is revealed.

**Q: What happens if I try to vote twice?**
A: The contract prevents double voting. Each address can only vote once per proposal.

**Q: Can I use any token for governance?**
A: Proposals specify the governance token. Only holders of that token can vote on the proposal.

**Q: Are there gas costs for voting?**
A: Yes, voting and proposal creation require gas. Encrypting votes and generating proofs is done off-chain, so on-chain costs are similar to standard DAO voting.

---

## License

This project is licensed under the [MIT License](./LICENSE).

---

## References
- [ZAMA FHE](https://zama.ai)
- [ZAMA FHE Documentation](https://docs.zama.ai) 