# FAQ

**Q: How is my vote kept private?**
A: Votes are encrypted using Fully Homomorphic Encryption (FHE) before being sent to the blockchain. Only the final tally is decrypted, never individual votes.

**Q: Can the contract owner or anyone else see my vote?**
A: No. The contract and all parties only see encrypted data. Only the final tally is revealed.

**Q: What is FHE?**
A: Fully Homomorphic Encryption allows computations on encrypted data without decrypting it. This enables private voting on-chain.

**Q: What happens if I try to vote twice?**
A: The contract prevents double voting. Each address can only vote once per proposal.

**Q: What if the oracle is compromised?**
A: The oracle only decrypts the final tally, not individual votes. The contract checks the oracle's signature to prevent tampering. For critical use cases, multiple oracles or threshold decryption can be implemented.

**Q: Can I use any token for governance?**
A: Proposals specify the governance token. Only holders of that token can vote on the proposal.

**Q: Can the contract be upgraded?**
A: The current implementation is not upgradeable, but future versions could use proxy patterns for upgradability. Upgrades should be governed by the DAO itself.

**Q: What if I lose my wallet?**
A: Like any Ethereum dApp, losing your wallet means losing access to your voting rights. Always back up your wallet securely.

**Q: What happens if the reveal is never requested?**
A: The proposal remains unresolved. Only the creator can request the reveal. Future versions could allow anyone to trigger the reveal after a timeout.

**Q: Are there gas costs for voting?**
A: Yes, voting and proposal creation require gas. Encrypting votes and generating proofs is done off-chain, so on-chain costs are similar to standard DAO voting.

**Q: Can I verify the tally is correct?**
A: Yes. The contract emits events and stores the revealed tally on-chain. Anyone can verify the oracle's signature and the contract's logic. 