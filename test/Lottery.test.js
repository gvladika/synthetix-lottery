const Lottery = artifacts.require("Lottery");
const IERC20 = artifacts.require("IERC20");
const MockSusdToken = artifacts.require("MockSusdToken");

let lottery;
let susd;
let abe, bill, cai, dona, ena;

function tokens(n) {
  return web3.utils.toWei(n.toString(), "ether");
}

beforeEach(async () => {
  [abe, bill, cai, dona] = await web3.eth.getAccounts();
  susd = await MockSusdToken.new();
  lottery = await Lottery.new(
    susd.address,
    "0x0000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000"
  );

  await susd.transfer(bill, tokens(0.3));
  await susd.transfer(cai, tokens(0.1));
  await susd.transfer(dona, tokens(0.15));
});

describe("Lottery", () => {
  it("deploys a contract", () => {
    console.log(lottery.address);
    console.log(susd.address);
    assert.ok(susd.address);
    assert.ok(lottery.address);
  });

  it("has access to susd balances", async () => {
    const billBalance = await susd.balanceOf(bill);
    assert.equal(billBalance, tokens(0.3));

    const caiBalance = await susd.balanceOf(cai);
    assert.equal(caiBalance, tokens(0.1));

    const donaBalance = await susd.balanceOf(dona);
    assert.equal(donaBalance, tokens(0.15));

    const lotteryBalance = await susd.balanceOf(lottery.address);
    assert.equal(lotteryBalance, tokens(0));

    assert.ok(lottery.susd);
  });

  it("can receive susd to prize pool", async () => {
    // Bill enters lottery 2 times
    await susd.approve(lottery.address, tokens(0.1), { from: bill });
    await lottery.enterLottery({ from: bill });
    await susd.approve(lottery.address, tokens(0.1), { from: bill });
    await lottery.enterLottery({ from: bill });

    let billBalance = await susd.balanceOf(bill);
    assert(billBalance, tokens(0.1));

    // Cai enters lottery
    await susd.approve(lottery.address, tokens(0.1), { from: cai });
    await lottery.enterLottery({ from: cai });

    let tickets = await lottery.getTickets();
    console.log(tickets);
    let caiBalance = await susd.balanceOf(cai);
    assert.equal(caiBalance, tokens(0));

    // Dona enters lottery
    await susd.approve(lottery.address, tokens(0.1), { from: dona });
    await lottery.enterLottery({ from: dona });

    let donaBalance = await susd.balanceOf(dona);
    assert.equal(donaBalance, tokens(0.05));

    // Check pool size
    lotteryBalance = await susd.balanceOf(lottery.address);
    console.log(lotteryBalance.toString());
    assert.equal(lotteryBalance, tokens(0.4));

    // Check NFTs representing tickets are minted
    tickets = await lottery.getTickets();
    console.log(tickets);
    assert.equal(tickets.length, 4);

    // Bill bought 2 tickets
    let billsTickets = await lottery.balanceOf(bill);
    assert.equal(billsTickets, 2);

    // Cai boght 1 ticket
    let caiTickets = await lottery.balanceOf(cai);
    assert.equal(caiTickets, 1);

    await lottery.selectRoundWinners();
    tickets = await lottery.getTickets();
    console.log(tickets);

    await lottery.claimPrize(0, { from: bill });
    tickets = await lottery.getTickets();
    console.log(tickets);

    await susd.approve(lottery.address, tokens(0.2), { from: bill });
    await lottery.enterLottery({ from: bill });
    await lottery.enterLottery({ from: bill });

    await susd.approve(lottery.address, tokens(0.2), { from: abe });
    await lottery.enterLottery({ from: abe });
    await lottery.enterLottery({ from: abe });

    await lottery.selectRoundWinners();
    tickets = await lottery.getTickets();
    console.log(tickets);

    lottery.close();
  });
});
