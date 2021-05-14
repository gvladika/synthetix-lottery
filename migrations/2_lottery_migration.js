const Lottery = artifacts.require("Lottery");
const SUSDToken = artifacts.require("SUSDToken");

module.exports = async function (deployer) {
  await deployer.deploy(SUSDToken);
  const susd = await SUSDToken.deployed();

  deployer.deploy(Lottery, susd.address);
};
