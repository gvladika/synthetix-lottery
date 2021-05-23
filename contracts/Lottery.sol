pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@chainlink/contracts/src/v0.8/dev/VRFConsumerBase.sol";

/**
 * @title Lottery
 * @notice ...
 * @author Goran Vladika
 */
contract Lottery is ERC721, VRFConsumerBase {
    address public owner;
    Ticket[] public tickets;
    uint256 ticketCost = 0.1 * 10**18;
    uint256 public currentPrizePoolInSusd;
    uint256 roundStartIndex;
    uint256 roundEndIndex;
    //uint256 private roundDuration = 6 hours;
    uint256 private roundDuration = 5 minutes;
    uint256 roundEndTime;

    IERC20 public susd;

    bytes32 private keyHash;
    uint256 private fee;
    address private vrfCoordinator;

    struct Ticket {
        bool isWinning;
        bool isClaimed;
        uint256 prize;
    }

    constructor(
        IERC20 _susd,
        address _vrfCoordinator,
        address _link,
        bytes32 _keyHash
    ) ERC721("LotteryTicket", "LTKT") VRFConsumerBase(_vrfCoordinator, _link) {
        owner = msg.sender;
        susd = _susd;
        roundEndTime = block.timestamp + roundDuration;

        vrfCoordinator = _vrfCoordinator;
        fee = 0.1 * 10**18;
        keyHash = _keyHash;
    }

    function enterLottery() external returns (uint256) {
        tickets.push(Ticket(false, false, 0));
        uint256 ticketId = tickets.length - 1;
        super._safeMint(msg.sender, ticketId);

        susd.transferFrom(msg.sender, address(this), ticketCost);
        currentPrizePoolInSusd += ticketCost;

        return ticketId;
    }

    function selectRoundWinners() external {
        require(msg.sender == owner);
        require(block.timestamp >= roundEndTime, "Round still runs!");

        roundEndIndex = tickets.length - 1;
        require(
            (roundEndIndex - roundStartIndex + 1) >= 3,
            "At least 3 tickets are required!!!"
        );

        // if no VRF coordinator is set use locally generated random number (for testing in local network)
        if (vrfCoordinator == address(0)) {
            updateTickets(_getRandomNumber());
            return;
        }

        require(
            LINK.balanceOf(address(this)) >= fee,
            "Not enough LINK - fill contract with faucet"
        );
        requestRandomness(keyHash, fee, block.timestamp);
    }

    function claimPrize(uint256 ticketId) external {
        require(
            super.ownerOf(ticketId) == msg.sender,
            "Only ticket owner can claim prize"
        );

        Ticket storage ticket = tickets[ticketId];
        require(ticket.isWinning, "Not a winning ticket");
        require(!ticket.isClaimed, "Ticket already claimed");

        ticket.isClaimed = true;
        susd.transfer(msg.sender, ticket.prize);
    }

    function _startNewRound() private {
        currentPrizePoolInSusd = 0;
        roundStartIndex = roundEndIndex + 1;
        roundEndIndex++;
        roundEndTime = block.timestamp + roundDuration;
    }

    function _getRandomNumber() private view returns (uint256) {
        return
            uint256(
                keccak256(abi.encodePacked(block.difficulty, block.timestamp))
            );
    }

    /**
     * Callback function used by VRF Coordinator
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomness)
        internal
        override
    {
        updateTickets(randomness);
    }

    function updateTickets(uint256 randomness) private {
        uint256 nonce = 0;
        uint256 randomNumber = randomness;

        //1st prize
        uint256 winningIndex = _getRandomIndex(randomNumber, ++nonce);
        Ticket storage ticketFirstPrize = tickets[winningIndex];
        ticketFirstPrize.isWinning = true;
        ticketFirstPrize.prize = (currentPrizePoolInSusd / 100) * 50;

        //2nd prize
        uint256 secondPrizeIndex = _getRandomIndex(randomNumber, ++nonce);
        while (secondPrizeIndex == winningIndex) {
            secondPrizeIndex = _getRandomIndex(randomNumber, ++nonce);
        }
        Ticket storage ticketSecondPrize = tickets[secondPrizeIndex];
        ticketSecondPrize.isWinning = true;
        ticketSecondPrize.prize = (currentPrizePoolInSusd / 100) * 35;

        //3rd prize
        uint256 thirdPrizeIndex = _getRandomIndex(randomNumber, ++nonce);
        while (
            thirdPrizeIndex == winningIndex ||
            thirdPrizeIndex == secondPrizeIndex
        ) {
            thirdPrizeIndex = _getRandomIndex(randomNumber, ++nonce);
        }
        Ticket storage ticketThirdPrize = tickets[thirdPrizeIndex];
        ticketThirdPrize.isWinning = true;
        ticketThirdPrize.prize = (currentPrizePoolInSusd / 100) * 15;

        _startNewRound();
    }

    function _getRandomIndex(uint256 randomNumber, uint256 nonce)
        private
        view
        returns (uint256)
    {
        uint256 tempHash = uint256(keccak256(abi.encode(randomNumber, nonce)));
        uint256 range = roundEndIndex - roundStartIndex + 1;
        return roundStartIndex + (tempHash % range);
    }

    function getTickets() public view returns (Ticket[] memory) {
        return tickets;
    }

    function close() public {
        selfdestruct(payable(owner));
    }
}
