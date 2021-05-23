pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockSusdToken
 * @notice mock implementation of the SUSD token contract used for local testing
 * @author Goran Vladika
 */
contract MockSusdToken is ERC20 {
    string internal constant NAME = "Mock Susd Token";
    string internal constant SYMBOL = "mSUSD";
    uint8 internal constant DECIMALS = 18;
    uint32 internal constant SUPPLY = 1000000;

    constructor() ERC20(NAME, SYMBOL) {
        // Mint 1 000 000 tokens to msg.sender
        _mint(msg.sender, SUPPLY * 10**uint256(DECIMALS));
    }
}
