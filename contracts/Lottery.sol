pragma solidity ^0.8.4;

import "./SusdToken.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract Lottery is ERC721 {
    address public owner;
    address[] public activePlayers;

    Ticket[] public tickets;

    IERC20 public susd;
    //IERC20 susd = IERC20(0x57Ab1ec28D129707052df4dF418D58a2D46d5f51);

    struct Ticket {
        bool isActive;
        bool isWinning;
        uint256 prize;
    }

    constructor(IERC20 _susd) ERC721("LotteryTicket", "LTKT") {
        owner = msg.sender;
        susd = _susd;
    }

    function enterLottery() public {
        tickets.push(Ticket(true, false, 0));
        uint256 ticketId = tickets.length - 1;
        super._safeMint(msg.sender, ticketId);

        activePlayers.push(msg.sender);
        susd.transferFrom(msg.sender, address(this), 10 * 10**18);
    }

    function getActivePlayers() public view returns (address[] memory) {
        return activePlayers;
    }

    function random() private view returns (uint256) {
        return
            uint256(
                keccak256(
                    abi.encodePacked(
                        block.difficulty,
                        block.timestamp,
                        activePlayers
                    )
                )
            );
    }
}
