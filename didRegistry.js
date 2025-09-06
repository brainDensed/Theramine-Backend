// DIDRegistry contract ABI and address for backend integration
const DID_REGISTRY_ABI = [
  {"type":"function","name":"dids","inputs":[{"name":"","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"string","internalType":"string"}],"stateMutability":"view"},
  {"type":"function","name":"didOwners","inputs":[{"name":"","type":"string","internalType":"string"}],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},
  {"type":"function","name":"getDID","inputs":[{"name":"user","type":"address","internalType":"address"}],"outputs":[{"name":"","type":"string","internalType":"string"}],"stateMutability":"view"},
  {"type":"function","name":"registerDID","inputs":[{"name":"did","type":"string","internalType":"string"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"function","name":"registerDIDFor","inputs":[{"name":"user","type":"address","internalType":"address"},{"name":"did","type":"string","internalType":"string"}],"outputs":[],"stateMutability":"nonpayable"},
  {"type":"event","name":"DIDCreated","inputs":[{"name":"user","type":"address","indexed":true,"internalType":"address"},{"name":"did","type":"string","indexed":false,"internalType":"string"}],"anonymous":false}
];

const DID_REGISTRY_ADDRESS = "0x3B665dC70eC2b6A276E4b9535A5B46411f32B1dA";

module.exports = { DID_REGISTRY_ABI, DID_REGISTRY_ADDRESS };
