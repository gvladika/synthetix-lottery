const Lottery = artifacts.require("Lottery");
const SusdToken = artifacts.require("SusdToken");

let lottery;
let susd;
let abe, bill, cai, dona, ena;

function tokens(n) {
  return web3.utils.toWei(n.toString(), "ether");
}

beforeEach(async () => {
  [abe, bill, cai, dona] = await web3.eth.getAccounts();
  susd = await SusdToken.new();
  lottery = await Lottery.new(susd.address);

  await susd.transfer(bill, tokens(30));
  await susd.transfer(cai, tokens(10));
  await susd.transfer(dona, tokens(15));
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
    assert.equal(abeBalance, tokens(45));

    const billBalance = await susd.balanceOf(bill);
    assert.equal(billBalance, tokens(30));

    const caiBalance = await susd.balanceOf(cai);
    assert.equal(caiBalance, tokens(10));

    const donaBalance = await susd.balanceOf(dona);
    assert.equal(donaBalance, tokens(15));

    const lotteryBalance = await susd.balanceOf(lottery.address);
    assert.equal(lotteryBalance, tokens(0));

    assert.ok(lottery.susd);
  });

  it("can receive susd to prize pool", async () => {
    // Bill enters lottery 2 times
    await susd.approve(lottery.address, tokens(10), { from: bill });
    await lottery.enterLottery({ from: bill });
    await susd.approve(lottery.address, tokens(10), { from: bill });
    await lottery.enterLottery({ from: bill });

    let billBalance = await susd.balanceOf(bill);
    assert.equal(billBalance, tokens(10));

    // Cai enters lottery
    await susd.approve(lottery.address, tokens(10), { from: cai });
    await lottery.enterLottery({ from: cai });

    let caiBalance = await susd.balanceOf(cai);
    assert.equal(caiBalance, tokens(0));

    // Dona enters lottery
    await susd.approve(lottery.address, tokens(10), { from: dona });
    await lottery.enterLottery({ from: dona });

    let donaBalance = await susd.balanceOf(dona);
    assert.equal(donaBalance, tokens(5));

    // Check pool size
    lotteryBalance = await susd.balanceOf(lottery.address);
    assert.equal(lotteryBalance, tokens(40));

    // Check NFTs representing tickets are minted
    let tickets = await lottery.getTickets();
    console.log(tickets);
    assert.equal(tickets.length, 4);

    // Bill bought 2 tickets
    let billsTickets = await lottery.balanceOf(bill);
    assert.equal(billsTickets, 2);

    // Cai boght 1 ticket
    let caiTickets = await lottery.balanceOf(cai);
    assert.equal(caiTickets, 1);

    await lottery.pickRoundWinners();
    tickets = await lottery.getTickets();
    console.log(tickets);

    await lottery.claimPrize(0, { from: bill });
    tickets = await lottery.getTickets();
    console.log(tickets);

    billBalance = await susd.balanceOf(bill);
    console.log(tokens(billBalance));
  });
});
