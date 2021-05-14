const Lottery = artifacts.require("Lottery");
const SusdToken = artifacts.require("SusdToken");

let lottery;
let susd;
let abe;
let bill;
let cai;

function tokens(n) {
  return web3.utils.toWei(n.toString(), "ether");
}

beforeEach(async () => {
  [abe, bill, cai] = await web3.eth.getAccounts();
  susd = await SusdToken.new();
  lottery = await Lottery.new(susd.address);

  await susd.transfer(bill, tokens(30));
  await susd.transfer(cai, tokens(10));
});

describe("Lottery", () => {
  it("deploys a contract", () => {
    console.log(lottery.address);
    console.log(susd.address);
    assert.ok(susd.address);
    assert.ok(lottery.address);
  });

  it("has access to susd balances", async () => {
    const abeBalance = await susd.balanceOf(abe);
    assert.equal(abeBalance, tokens(60));

    const billBalance = await susd.balanceOf(bill);
    assert.equal(billBalance, tokens(30));

    const caiBalance = await susd.balanceOf(cai);
    assert.equal(caiBalance, tokens(10));

    const lotteryBalance = await susd.balanceOf(lottery.address);
    assert.equal(lotteryBalance, tokens(0));

    assert.ok(lottery.susd);
  });

  it("can receive susd to pool", async () => {
    await susd.approve(lottery.address, tokens(10));

    await lottery.enterLottery();

    const abeBalance = await susd.balanceOf(abe);
    assert.equal(abeBalance, tokens(50));

    const billBalance = await susd.balanceOf(bill);
    assert.equal(billBalance, tokens(30));

    const caiBalance = await susd.balanceOf(cai);
    assert.equal(caiBalance, tokens(10));

    const lotteryBalance = await susd.balanceOf(lottery.address);
    assert.equal(lotteryBalance, tokens(10));

    const activePlayers = await lottery.getActivePlayers();
    assert.equal(1, activePlayers.length);
    assert.equal(abe, activePlayers[0]);
  });
});
