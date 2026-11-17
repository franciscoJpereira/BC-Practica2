export const addresses = {
  delayedPayment:
    import.meta.env.VITE_CONTRACT_ADDRESS ||
    "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  startBlock: Number(import.meta.env.VITE_START_BLOCK) || 0,
};

export default addresses;

