# Usage Guide

This guide provides a comprehensive walkthrough for using the Confidential DAO app, including technical details and troubleshooting tips.

---

## 1. Connect Your Wallet
- Open the app in your browser.
- Click the 'Connect Wallet' button.
- Choose your preferred wallet (MetaMask, WalletConnect, etc.).
- The app will request permission to view your wallet address and network.
- **Technical note:** The frontend uses ethers.js/web3.js to interact with the wallet and Ethereum network.

## 2. Create a Proposal
- Navigate to the dashboard and click 'Create Proposal'.
- Enter the proposal title, description, and select the governance token (ERC-20 address).
- Set the voting duration (in seconds or days).
- Pay the proposal fee (displayed in ETH).
- **Technical note:** The frontend calls the `createProposal` function on the smart contract, passing the token address and duration. The transaction must be confirmed in your wallet.
- After confirmation, the proposal appears in the dashboard.

## 3. Vote Privately
- Select an active proposal from the dashboard.
- Choose your vote: For, Against, or Abstain.
- When you vote:
  - The frontend uses FHE libraries (WASM/JS) to encrypt your vote locally.
  - A cryptographic proof is generated to prove the vote is valid (0, 1, or 2).
  - The encrypted vote and proof are sent to the contract via the `vote` function.
  - The contract verifies the proof and updates the encrypted tallies.
- **Security:** Your vote is never sent in plaintext; only the encrypted value and proof are transmitted.
- **Troubleshooting:**
  - If you see 'Not a token holder', ensure your wallet holds the required governance token.
  - If 'Already voted', you cannot vote again on the same proposal.
  - If 'Voting ended', the proposal is closed for voting.

## 4. Reveal the Tally
- After the voting period ends, the proposal creator can click 'Reveal Tally'.
- The frontend calls `requestTallyReveal` on the contract.
- The contract requests the FHE oracle to decrypt the encrypted tallies.
- Once the oracle responds, the contract updates the proposal with the revealed results.
- **Technical note:** The reveal process may take a few minutes, depending on oracle response time.

## 5. View Results
- Once revealed, the final tally (For, Against, Abstain) is displayed on the proposal page.
- All users can see the results, but individual votes remain private.

---

## Example Voting Flow
1. Alice creates a proposal to change DAO rules, using the DAO's governance token.
2. Bob, Carol, and Dave each vote privately (For, Against, Abstain). Their votes are encrypted and tallied on-chain.
3. After the deadline, Alice requests the tally reveal. The oracle decrypts the final tally.
4. The result is published: 2 For, 1 Against, 0 Abstain. No one knows how Bob, Carol, or Dave voted individually.

---

## Cryptographic Process (Voting)
- **Encryption:** The vote (0, 1, or 2) is encrypted in the browser using FHE.
- **Proof Generation:** A zero-knowledge proof is generated to show the vote is valid.
- **On-chain:** The contract uses FHE operations to add the encrypted vote to the correct tally.
- **Decryption:** Only the final tally is decrypted by the oracle, never individual votes.

---

## Troubleshooting
- **Transaction failed:** Check your wallet balance for gas fees and ensure you are on the correct network.
- **Proposal not appearing:** Wait for transaction confirmation and refresh the dashboard.
- **Reveal stuck:** The oracle may be delayed; try again after a few minutes.

For further help, consult the FAQ or open an issue on the project repository. 