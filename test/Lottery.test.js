const Lottery = artifacts.require("Lottery");
const MockSusdToken = artifacts.require("MockSusdToken");
const { expectEvent, expectRevert } = require("@openzeppelin/test-helpers");
const timeMachine = require("ganache-time-traveler");

let lottery;
let susd;
let abe, bill, cai, dona;
let addresZero = "0x0000000000000000000000000000000000000000";

function tokens(n) {
  return web3.utils.toWei(n.toString(), "ether");
}

contract("Lottery", async () => {
  // create contracts and send some Mock SUSD to participants
  before(async () => {
    [abe, bill, cai, dona] = await web3.eth.getAccounts();
    susd = await MockSusdToken.new();
    lottery = await Lottery.new(susd.address, addresZero, addresZero, addresZero, "0");

    await susd.transfer(bill, tokens(20));
    await susd.transfer(cai, tokens(20));
    await susd.transfer(dona, tokens(20));
  });

  it("has correct initial state", async () => {
    assert.ok(susd.address);
    assert.ok(lottery.address);

    prizePool = await lottery.currentPrizePoolInSusd();
    assert.equal(prizePool, 0);

    tickets = await lottery.getTickets();
    assert.equal(tickets.length, 0);
  });

  it("lets user to buy lottery ticket", async () => {
    const billBalance = await susd.balanceOf(bill);
    assert.equal(billBalance, tokens(20));

    // user needs to approve sUSD for spending
    await susd.approve(lottery.address, tokens(1), { from: bill });

    //buy ticket
    billsTicket = await lottery.buyLotteryTicket({ from: bill });
    assert.equal(billsTicket.logs[0].args.tokenId.toString(), tokens(0));

    tickets = await lottery.getTickets();
    assert.equal(tickets.length, 1);

    numOfBillsTickets = await lottery.balanceOf(bill);
    assert.equal(numOfBillsTickets, 1);

    prizePool = await lottery.currentPrizePoolInSusd();
    assert.equal(prizePool.toString(), tokens(1));
  });

  it("selects lottery winners", async () => {
    await expectRevert(lottery.selectRoundWinners(), "Lottery round still runs!");
    //advance 6 hours
    await timeMachine.advanceTimeAndBlock(6 * 60 * 60);

    // 3 tickets at least are needed
    await expectRevert(lottery.selectRoundWinners(), "At least 3 tickets are required!");

    await susd.approve(lottery.address, tokens(1), { from: cai });
    await lottery.buyLotteryTicket({ from: cai });

    await susd.approve(lottery.address, tokens(1), { from: dona });
    await lottery.buyLotteryTicket({ from: dona });

    // select winners
    const receipt = await lottery.selectRoundWinners();
    expectEvent(receipt, "WinnersSelected");

    // Check NFTs are minted and prizes are correctly calculated
    tickets = await lottery.getTickets();
    assert.equal(tickets.length, 3);
    assert.equal(tickets.filter((x) => x.isWinning).length, 3);
    assert.equal(tickets.filter((x) => x.isClaimed).length, 0);
    assert.equal(tickets.filter((x) => x.prize == tokens(1.5)).length, 1);
    assert.equal(tickets.filter((x) => x.prize == tokens(1.05)).length, 1);
    assert.equal(tickets.filter((x) => x.prize == tokens(0.45)).length, 1);
  });

  it("allows users to claim prizes", async () => {
    tickets = await lottery.getTickets();

    // claim bills winning ticket
    const billsTicketIndex = 0;
    let billsTicket = tickets[billsTicketIndex];
    assert(billsTicket.isWinning);
    assert(!billsTicket.isClaimed);

    const billSusdBalanceBefore = await susd.balanceOf(bill);
    const lotterySusdBalanceBefore = await susd.balanceOf(lottery.address);

    await lottery.claimPrize(billsTicketIndex, { from: bill });

    const billSusdBalanceAfter = await susd.balanceOf(bill);
    const lotterySusdBalanceAfter = await susd.balanceOf(lottery.address);

    // check bill's balance increased, and lottery contract's balance decreased
    assert(billSusdBalanceAfter > billSusdBalanceBefore);
    assert(lotterySusdBalanceAfter < lotterySusdBalanceBefore);

    // check ticket is not claimable anymore
    tickets = await lottery.getTickets();
    billsTicket = tickets[billsTicketIndex];
    assert(billsTicket.isClaimed);
    await expectRevert(
      lottery.claimPrize(billsTicketIndex, { from: bill }),
      "Ticket already claimed"
    );
  });
});
