// Backend utility to register a DID for a user on BlockDAG testnet
const { ethers } = require("ethers");
const { DID_REGISTRY_ABI, DID_REGISTRY_ADDRESS } = require("./didRegistry");

// Load from .env or hardcode for demo
const RPC_URL = process.env.RPC_URL || "https://rpc.primordial.bdagscan.com";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "60cf0cf71a6238c97b3055847c85f8b006281132bc79f5db478b402504add685";

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(DID_REGISTRY_ADDRESS, DID_REGISTRY_ABI, wallet);



// Checks if a DID is already registered for the user's wallet address
async function registerDIDForUser(userAddress, didString) {
  try {
    // Check if DID already exists for this user address
    const existingDID = await contract.getDID(userAddress);
    if (existingDID && existingDID !== "") {
      console.log(`DID already registered for ${userAddress}: ${existingDID}`);
      return { did: existingDID, alreadyRegistered: true };
    }
    // Register new DID for the user address (as contract owner)
    const tx = await contract.connect(wallet).registerDIDFor(userAddress, didString);
    await tx.wait();
    console.log(`DID registered for ${userAddress}: ${didString}`);
    return { did: didString, alreadyRegistered: false };
  } catch (err) {
    console.error("Error registering DID:", err);
    throw err;
  }
}

module.exports = { registerDIDForUser };
