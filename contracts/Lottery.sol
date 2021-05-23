pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@chainlink/contracts/src/v0.8/dev/VRFConsumerBase.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @notice implementation of Synthetix Lottery
 * @dev Synthetix Lottery lets users buy tickets with their sUSD. Tickets
 * are represented as NFTs, minted upon purchase. Since tickets conform to
 * ERC721, they can be re-transfered. Ticket price is fixed to 1 sUSD. Every
 * round of lottery lasts for limited amount of time. In addition, to
 * successfully finish round, at least 3 tickets must be bought. Then,
 * anyone can call `selectRoundWinners` function which will use Chainlink's
 * VRF to randomly select 3 winners. Owners of tickets can claim their
 * prize at any point.
 * @author Goran Vladika
 */
contract Lottery is ERC721, VRFConsumerBase {
    // ticket is NFT minted to sender upon buying the ticket
    struct Ticket {
        bool isWinning;
        bool isClaimed;
        uint256 prize;
    }

    // stores all tickets, position in array is ticketId
    Ticket[] public tickets;

    // ERC721 NFT name and symbol
    string internal constant NAME = "Synthetix Lottery Ticket";
    string internal constant SYMBOL = "sTICK";

    // tickets are paid for in sUSD
    IERC20 public susd;

    // ticket cost is fixed to 1 sUSD
    uint256 public constant ticketCost = 1 * 10**18;

    // lottery round has starting index, and prize pool in sUSD
    uint256 public currentPrizePoolInSusd;
    uint256 public roundStartIndex;

    // each rounds lasts for this amount of time
    uint256 private roundDuration = 6 hours;
    uint256 roundEndTime;

    // params needed for generating randomness
    bytes32 private keyHash;
    uint256 private feeInLink;
    address private vrfCoordinator;

    // emitted when winners of lottery round are selected
    event WinnersSelected(
        uint256 indexed ticketIdWinner,
        uint256 indexed ticketIdSecondPlace,
        uint256 indexed ticketIdThirdPlace
    );

    // emitted when new round is started
    event NewLotteryRoundStarted(
        uint256 ticketStartingIndex,
        uint256 roundEndTime
    );

    /**
     * @param _susd address of the sUSD token
     * @param _vrfCoordinator address of the Chainlink VRF Coordinator
     * @param _link address of LINK token
     * @param _keyHash public key against which randomness is generated
     */
    constructor(
        IERC20 _susd,
        address _vrfCoordinator,
        address _link,
        bytes32 _keyHash,
        uint256 _feeInLink
    ) ERC721(NAME, SYMBOL) VRFConsumerBase(_vrfCoordinator, _link) {
        susd = _susd;
        vrfCoordinator = _vrfCoordinator;
        keyHash = _keyHash;
        feeInLink = _feeInLink;

        // start timer and announce lottery has started
        roundEndTime = block.timestamp + roundDuration;
        emit NewLotteryRoundStarted(roundStartIndex, roundEndTime);
    }

    /**
     * @notice lets user buy lottery ticket.
     * @dev new NFT ticket is minted for sender. `ticketCost` is transfered
     * from sender to contract
     * @return ticketId
     */
    function buyLotteryTicket() external returns (uint256) {
        // create ticket and push to array
        tickets.push(Ticket(false, false, 0));
        uint256 ticketId = tickets.length - 1;

        //mint NFT
        super._safeMint(msg.sender, ticketId);

        // transfer sUSD from user to contract
        susd.transferFrom(msg.sender, address(this), ticketCost);

        //update prize pool
        currentPrizePoolInSusd += ticketCost;

        return ticketId;
    }

    /**
     * @notice selects lottery winners of this round
     * @dev Prerequisites:
     * -> at least `roundDuration` passed since round start
     * -> there are at least 3 tickets bought in this round
     * -> contract has enough LINK to request randomness
     *
     * Contract will request radnomness via VRF coordinator. Using given
     * random number 3 winning tickets will be selected and prizes will be
     * available for claiming. Prizes are 50%, 35% and 15% of prize pool.
     * After selecting winners new round is started.
     */
    function selectRoundWinners() external {
        require(block.timestamp >= roundEndTime, "Lottery round still runs!");
        require(
            tickets.length - roundStartIndex >= 3,
            "At least 3 tickets are required!"
        );

        // if no VRF coordinator is set use locally generated random number
        // (for testing in local network)
        if (vrfCoordinator == address(0)) {
            _selectWinners(_getRandomNumber());
            return;
        }

        // request randomness using VFR coordinator to select winners
        require(
            LINK.balanceOf(address(this)) >= feeInLink,
            "Not enough LINK in contract to request randomness"
        );
        requestRandomness(keyHash, feeInLink, block.timestamp);
    }

    /**
     * @notice Lets user to claim his prize
     * @dev Owner of the ticket will be transfered his prize sUSD
     */
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

    /**
     * @notice Selects 3 winning tickets for this lottery round
     * @dev 3 tickets from this round are chosen using VFR randomness.
     * Prizes are assigned - 50%, 35% and 15% of prize pool.
     */
    function _selectWinners(uint256 randomness) private {
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

        // emit winners
        emit WinnersSelected(winningIndex, secondPrizeIndex, thirdPrizeIndex);

        // refresh state for new round
        _startNewRound();
    }

    /**
     * @notice Refresh state to start new round
     */
    function _startNewRound() private {
        currentPrizePoolInSusd = 0;
        roundStartIndex = tickets.length;
        roundEndTime = block.timestamp + roundDuration;
        emit NewLotteryRoundStarted(roundStartIndex, roundEndTime);
    }

    /**
     * @notice Callback function used by VRF Coordinator
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomness)
        internal
        override
    {
        requestId.length;
        _selectWinners(randomness);
    }

    /**
     * @notice Helper function to generate random number, only used for testing in local network
     */
    function _getRandomNumber() private view returns (uint256) {
        return
            uint256(
                keccak256(abi.encodePacked(block.difficulty, block.timestamp))
            );
    }

    /**
     * @notice select random index from inputs - randomness and nonce
     * @return random index
     */
    function _getRandomIndex(uint256 randomNumber, uint256 nonce)
        private
        view
        returns (uint256)
    {
        uint256 tempHash = uint256(keccak256(abi.encode(randomNumber, nonce)));
        uint256 range = tickets.length - roundStartIndex;
        return roundStartIndex + (tempHash % range);
    }

    /**
     * @notice getter for tickets
     * @return tickets
     */
    function getTickets() public view returns (Ticket[] memory) {
        return tickets;
    }

    /**
     * @notice get all tickets owned by _owner
     * @return ticket ids
     */
    function getTicketsByOwner(address _owner)
        external
        view
        returns (uint256[] memory)
    {
        uint256[] memory result = new uint256[](super.balanceOf(_owner));
        uint256 counter = 0;
        for (uint256 i = 0; i < tickets.length; i++) {
            if (super.ownerOf(i) == _owner) {
                result[counter] = i;
                counter++;
            }
        }
        return result;
    }
}
