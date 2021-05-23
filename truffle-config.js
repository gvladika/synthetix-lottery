const HDWalletProvider = require("@truffle/hdwallet-provider");
const NonceTrackerSubprovider = require("web3-provider-engine/subproviders/nonce-tracker");

const fs = require("fs");
const SECRET = fs.readFileSync(".secret").toString().trim();
const ENDPOINT = fs.readFileSync(".endpoint").toString().trim();

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1", // Localhost (default: none)
      port: 7545, // Standard Ethereum port (default: none)
      network_id: "5777", // Any network (default: none)
    },
    kovan: {
      provider: function () {
        let wallet = new HDWalletProvider(SECRET, ENDPOINT);
        let nonceTracker = new NonceTrackerSubprovider();
        wallet.engine._providers.unshift(nonceTracker);
        nonceTracker.setEngine(wallet.engine);
        return wallet;
      },
      network_id: 42,
      skipDryRun: true,
    },
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    timeout: 300000,
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.0",
    },
  },

  db: {
    enabled: false,
  },
};
