const Lottery = artifacts.require("Lottery");
const MockSusdToken = artifacts.require("MockSusdToken");

module.exports = async function (deployer, network) {
  console.log("network: ", network);
  if (network == "kovan") {
    const kovanSusd = "0x57ab1ec28d129707052df4df418d58a2d46d5f51";
    const kovanVrfCoordinator = "0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9";
    const kovanLink = "0xa36085f69e2889c224210f603d836748e7dc0088";
    const kovanKeyHash = "0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4";
    //0.1 * 10 ** 18
    const kovanFeeInLink = "100000000000000000";
    deployer.deploy(
      Lottery,
      kovanSusd,
      kovanVrfCoordinator,
      kovanLink,
      kovanKeyHash,
      kovanFeeInLink
    );
  } else {
    await deployer.deploy(MockSusdToken);
    const susd = await MockSusdToken.deployed();

    deployer.deploy(
      Lottery,
      susd.address,
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000",
      "0"
    );
  }
};
