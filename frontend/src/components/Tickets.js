import React, { Component } from "react";
import { Table, Button } from "semantic-ui-react";

class Tickets extends Component {
  render() {
    return (
      <Table celled>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Ticket ID</Table.HeaderCell>
            <Table.HeaderCell>Prize</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>{this.renderRows()}</Table.Body>
      </Table>
    );
  }

  renderButton(isClaimed, ticketId) {
    if (!isClaimed) {
      return (
        <Button floated="right" positive onClick={() => this.onClickClaim(ticketId)}>
          Claim
        </Button>
      );
    }
  }

  renderRows() {
    return Object.keys(this.props.tickets)
      .reverse()
      .map((ticketId) => {
        let ticket = this.props.tickets[ticketId];
        let isActive = Number(this.props.roundStartIndex) <= Number(ticketId);
        let isLosing = !isActive && !ticket.isWinning;
        let status = "";

        if (ticket.isClaimed) status = "Claimed";
        else if (ticket.isWinning) status = "Congratulations!";
        else if (isActive) status = "Fingers crossed!";
        else status = "No luck with this one";

        return (
          <Table.Row negative={isLosing} positive={ticket.isWinning}>
            <Table.Cell>{ticketId} </Table.Cell>
            <Table.Cell>{window.web3.utils.fromWei(ticket["prize"].toString())} sUSD</Table.Cell>
            <Table.Cell>
              {status} {ticket.isWinning ? this.renderButton(ticket.isClaimed, ticketId) : null}
            </Table.Cell>
          </Table.Row>
        );
      });
  }

  onClickClaim = async (ticketId) => {
    await this.props.lottery.methods.claimPrize(ticketId).send({ from: this.props.account });
  };
}

export default Tickets;
