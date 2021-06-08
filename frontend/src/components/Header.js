import React, { Component } from "react";
import { Menu } from "semantic-ui-react";
import spartan from "../spartan.png";

class Header extends Component {
  render() {
    return (
      <Menu style={{ marginTop: "10px" }} color="blue" inverted>
        <Menu.Item name="home">
          <img src={spartan} width="30" height="30" alt="" />
        </Menu.Item>
        <Menu.Item name="messages">&nbsp;SYNTHETIX LOTTERY</Menu.Item>
        <Menu.Menu position="right">
          <Menu.Item name="Acc">{this.props.account}</Menu.Item>
        </Menu.Menu>
      </Menu>
    );
  }
}

export default Header;
