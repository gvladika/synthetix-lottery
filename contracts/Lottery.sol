pragma solidity ^0.8.4;

import "./SusdToken.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract Lottery is ERC721 {
    address public owner;
    Ticket[] public tickets;
    uint256 ticketCost = 10 * 10**18;
    uint256 currentPrizePoolInSusd;
    uint256 roundStartIndex;
    uint256 roundEndIndex;

    IERC20 public susd;
    //IERC20 susd = IERC20(0x57Ab1ec28D129707052df4dF418D58a2D46d5f51);

    struct Ticket {
        bool isWinning;
        uint256 prize;
    }

    constructor(IERC20 _susd) ERC721("LotteryTicket", "LTKT") {
        owner = msg.sender;
        susd = _susd;
    }

    function enterLottery() external {
        tickets.push(Ticket(false, 0));
        uint256 ticketId = tickets.length - 1;
        super._safeMint(msg.sender, ticketId);

        susd.transferFrom(msg.sender, address(this), ticketCost);
        currentPrizePoolInSusd += ticketCost;
    }

    function pickRoundWinners() external {
        require(msg.sender == owner);

        roundEndIndex = tickets.length - 1;
        require(
            roundEndIndex - roundStartIndex >= 3,
            "At least 3 tickets are required"
        );

        uint256 nonce = 0;
        uint256 randomNumber = _getRandomNumber();

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

    function _startNewRound() private {
        currentPrizePoolInSusd = 0;
        roundStartIndex = roundEndIndex + 1;
        roundEndIndex++;
    }

    function _getRandomNumber() private view returns (uint256) {
        return
            uint256(
                keccak256(abi.encodePacked(block.difficulty, block.timestamp))
            );
    }

    function _getRandomIndex(uint256 randomNumber, uint256 nonce)
        private
        view
        returns (uint256)
    {
        uint256 tempHash = uint256(keccak256(abi.encode(randomNumber, nonce)));
        uint256 range = roundEndIndex - roundStartIndex;
        return roundStartIndex + (tempHash % range);
    }
}
