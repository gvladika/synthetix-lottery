import React, { Component } from "react";
import Web3 from "web3";
import Lottery from "contracts/Lottery.json";
import IERC20 from "contracts/IERC20.json";
import HeaderComp from "./components/Header";
import Tickets from "./components/Tickets";
import "semantic-ui-css/semantic.min.css";
import { Container, Button, Grid, Header, Segment, Divider } from "semantic-ui-react";
import "./App.css";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      myAccount: "",
      myTickets: {},
      prizePool: "0",
      lottery: {},
      susd: {},
      roundEndTime: "",
      roundStartIndex: 0,
      timeRemaining: "",
      loading: false,
    };
  }

  componentDidMount() {
    // countdown timer for lottery endtime
    this.interval = setInterval(
      () =>
        this.setState({ timeRemaining: Math.round(this.state.roundEndTime - Date.now() / 1000) }),
      1000
    );
  }

  async componentWillMount() {
    await this.loadWeb3();
    await this.loadContracts();
    await this.loadData();
  }

  /**
   * Find web3 provider and subscribe to account changes
   */
  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum);
      await window.ethereum.enable();
    } else if (window.web3) {
      window.web3 = new Web3(window.web3.provider);
    } else {
      window.alert("Metamask not found!");
    }

    window.ethereum.on("accountsChanged", async (accounts) => {
      this.setState({ myAccount: accounts[0] });
      await this.loadContracts();
      await this.loadData();
    });
  }

  /**
   * Load Lottery and sUSD from detected network
   */
  async loadContracts() {
    const web3 = window.web3;

    const accounts = await web3.eth.getAccounts();
    this.setState({ myAccount: accounts[0] });

    const networkId = await web3.eth.net.getId();

    const lotteryData = Lottery.networks[networkId];
    if (!lotteryData) {
      window.alert("Lottery contract is not deployed to detected network ");
      return;
    }

    const lottery = new web3.eth.Contract(Lottery.abi, lotteryData.address);
    this.setState({ lottery });

    const susdAddress = await lottery.methods.susd().call();
    const susd = new web3.eth.Contract(IERC20.abi, susdAddress);
    this.setState({ susd });
  }

  /**
   * Load lottery data
   */
  async loadData() {
    const lottery = this.state.lottery;

    const prizePool = await lottery.methods.currentPrizePoolInSusd().call();
    this.setState({ prizePool });

    this.setState({ myTickets: {} });
    let ticketIDs = await lottery.methods.getTicketsByOwner(this.state.myAccount).call();
    for (const id of ticketIDs) {
      const ticket = await lottery.methods.tickets(id).call();
      this.state.myTickets[id] = ticket;
    }

    const roundStartIndex = await lottery.methods.roundStartIndex().call();
    this.setState({ roundStartIndex });

    const roundEndTime = await lottery.methods.roundEndTime().call();
    this.setState({ roundEndTime });
  }

  /**
   * Approve sUSD and buy NFT lottery ticket
   */
  onClickBuy = async () => {
    this.setState({ loading: true });

    try {
      await this.state.susd.methods
        .approve(this.state.lottery.options.address, this.tokens(1))
        .send({ from: this.state.myAccount });

      await this.state.lottery.methods.buyLotteryTicket().send({ from: this.state.myAccount });
      await this.loadData();
    } finally {
      this.setState({ loading: false });
    }
  };

  /**
   * Select lottery winners
   */
  onClickSelectWinners = async () => {
    if (this.state.timeRemaining > 0) {
      window.alert("Lottery still running!");
      return;
    }

    var tickets = await this.state.lottery.methods.getTickets().call();
    var roundStartIndex = await this.state.lottery.methods.roundStartIndex().call();
    if (tickets.length - roundStartIndex < 3) {
      window.alert("At least 3 tickets required!");
      return;
    }

    this.setState({ loading: true });
    try {
      await this.state.lottery.methods.selectRoundWinners().send({ from: this.state.myAccount });
      await this.loadData();
    } finally {
      this.setState({ loading: false });
    }
  };

  /**
   * Convert token amount to wei
   */
  tokens(n) {
    return window.web3.utils.toWei(n.toString(), "ether");
  }

  /**
   * Format time remaining for countdown
   */
  timeRemaining() {
    var remaining = { days: 0, hours: 0, minutes: 0, seconds: 0 };

    var seconds = this.state.timeRemaining;
    if (seconds < 0) return remaining;

    var minutes = Math.floor(seconds / 60);
    var hours = Math.floor(minutes / 60);
    var days = Math.floor(hours / 24);

    remaining.days = days;
    remaining.hours = hours - remaining.days * 24;
    remaining.minutes = minutes - remaining.days * 24 * 60 - remaining.hours * 60;
    remaining.seconds =
      seconds - remaining.days * 24 * 60 * 60 - remaining.hours * 60 * 60 - remaining.minutes * 60;

    return remaining;
  }

  render() {
    return (
      <Container>
        <HeaderComp account={this.state.myAccount} />
        <Grid className="ui container center aligned" style={{ marginTop: "10px" }}>
          <Grid.Row centered textAlign="center" columns={1}>
            <Header size="huge">DO YOU FEEL LUCKY PUNK?</Header>
          </Grid.Row>

          <Grid.Row columns={2}>
            <Grid.Column>
              <Header as="h3" textAlign="center">
                MY TICKETS
              </Header>{" "}
              <Tickets
                tickets={this.state.myTickets}
                roundStartIndex={this.state.roundStartIndex}
                lottery={this.state.lottery}
                account={this.state.myAccount}
              ></Tickets>
            </Grid.Column>

            <Grid.Column>
              <Header as="h2">
                <Header.Content>
                  {window.web3.utils.fromWei(this.state.prizePool, "ether")} sUSD
                  <Header.Subheader>Current Prize Pool </Header.Subheader>
                </Header.Content>
              </Header>

              <Header as="h2">
                <Header.Content>
                  {" "}
                  {this.timeRemaining().days} d {this.timeRemaining().hours} h{" "}
                  {this.timeRemaining().minutes} min {this.timeRemaining().seconds} sec
                  <Header.Subheader>Until Round Ends</Header.Subheader>
                </Header.Content>
              </Header>

              <Segment basic textAlign="center">
                <Button loading={this.state.loading} size="huge" primary onClick={this.onClickBuy}>
                  Buy ticket for 1 sUSD!
                </Button>

                <Divider horizontal>Or</Divider>

                <Button loading={this.state.loading} secondary onClick={this.onClickSelectWinners}>
                  Select winners!
                </Button>
              </Segment>
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </Container>
    );
  }
}

export default App;
