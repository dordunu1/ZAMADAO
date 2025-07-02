const functions = require('firebase-functions');
const { createInstance } = require('@zama-fhe/relayer-sdk');

// Hardcoded contract address and chain ID
const DAO_CONTRACT_ADDRESS = '0xBF383B5F5aE68C048Cd124971FF8531DB624A48d';
const CHAIN_ID = 11155111; // Sepolia

exports.encryptVote = functions.https.onRequest(async (req, res) => {
  try {
    const { voteValue, proposalId } = req.body;
    if (typeof voteValue !== 'number') {
      return res.status(400).json({ error: 'voteValue must be a number' });
    }
    // Initialize FHE instance
    const fhe = await createInstance({ chainId: CHAIN_ID });

    // Fetch contract FHE public key
    const contractPublicKey = await fhe.getPublicKey({
      contractAddress: DAO_CONTRACT_ADDRESS,
      chainId: CHAIN_ID,
    });

    // Encrypt vote and generate proof
    const { ciphertext, proof } = await fhe.encryptU64WithProof({
      value: voteValue,
      publicKey: contractPublicKey,
      contractAddress: DAO_CONTRACT_ADDRESS,
      chainId: CHAIN_ID,
    });

    res.json({ ciphertext, proof });
  } catch (err) {
    console.error('Error in encryptVote:', err);
    res.status(500).json({ error: err.message });
  }
}); 