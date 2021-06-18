// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";

/**
 * @title Staking Contract
 * @author David Rochus
 * @notice Alyra DeFi4 - Staking contract
 */
contract Staking is Ownable {
    using SafeMath for uint256;

    struct Stake {
        bool isActive;
        address staker;
        address token;
        uint256 value;
        uint256 timestamp;
    }

    Stake[] public stakes;
    mapping(address => uint256) public stakeList;
    mapping(address => address) public priceFeed;

    event ERC20Staked(address staker, address token, uint256 amount);
    event ERC20Unstaked(address staker, address token, uint256 stakeAmount);
    event RewardClaimed(address staker, uint256 rewardAmount);
    event RewardsFunded(uint256 rewardsAmount);
    event RewardsRefunded(uint256 rewardsAmount);

    constructor() public {
        // DAI/ETH
        priceFeed[
            0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa
        ] = 0x22B58f1EbEDfCA50feF632bD73368b2FdA96D541;
        // ALY/ETH (AAVE/ETH)
        priceFeed[
            0x02D9844E6c67B6251eDf631f0eC72C4D545e6eAb
        ] = 0xd04647B7CB523bb9f26730E9B6dE1174db7591Ad;
        // Init first (dummy) stake 0
        Stake memory stakeData;
        stakes.push(stakeData);
    }

    function stake(address _tokenAddress, uint256 _tokenValue) external {
        require(_tokenValue > 0, "No Token value to fund !");

        ERC20(_tokenAddress).transferFrom(
            msg.sender,
            address(this),
            _tokenValue
        );
        if (stakes[stakeList[msg.sender]].isActive == true) {
            stakes[stakeList[msg.sender]].value = stakes[stakeList[msg.sender]]
                .value
                .add(_tokenValue);
        } else {
            Stake memory stakeData;
            stakeData.isActive = true;
            stakeData.staker = msg.sender;
            stakeData.token = _tokenAddress;
            stakeData.value = _tokenValue;
            stakeData.timestamp = now;
            stakes.push(stakeData);
            stakeList[msg.sender] = (stakes.length - 1);
        }

        emit ERC20Staked(msg.sender, _tokenAddress, _tokenValue);
    }

    function unstake() external {
        require(stakes[stakeList[msg.sender]].value > 0, "No current Stake !");

        uint256 amount = stakes[stakeList[msg.sender]].value;
        address token = stakes[stakeList[msg.sender]].token;

        if (calculateReward(msg.sender) > 0) claimReward();
        stakes[stakeList[msg.sender]].isActive = false;
        stakes[stakeList[msg.sender]].value = 0;
        stakes[stakeList[msg.sender]].token = address(0);
        ERC20(token).transfer(msg.sender, amount);

        emit ERC20Unstaked(msg.sender, token, amount);
    }

    function stakeOf(address _stakeholder) external view returns (uint256) {
        return stakes[stakeList[_stakeholder]].value;
    }

    function stakeTokenOf(address _stakeholder)
        external
        view
        returns (address)
    {
        return stakes[stakeList[_stakeholder]].token;
    }

    function totalStakes() external view returns (uint256) {
        uint256 _totalStakes = 0;

        for (uint256 i = 1; i < stakes.length; i++) {
            if (stakes[i].isActive) {
                uint256 ERC20ETHPrice =
                    uint256(getERC20ETHPrice(stakes[i].token));
                _totalStakes += ((stakes[i].value * ERC20ETHPrice) / 1e18);
            }
        }
        return _totalStakes;
    }

    function totalRewards() external view returns (uint256) {
        uint256 _totalRewards = 0;

        for (uint256 i = 1; i < stakes.length; i++) {
            if (stakes[i].isActive) {
                _totalRewards += calculateReward(stakes[i].staker);
            }
        }
        return _totalRewards;
    }

    function calculateReward(address _stakeholder)
        public
        view
        returns (uint256)
    {
        if (stakes[stakeList[_stakeholder]].value == 0) {
            return 0;
        }
        uint256 ERC20ETHPrice =
            uint256(getERC20ETHPrice(stakes[stakeList[_stakeholder]].token));
        uint256 stakingDays =
            (now - stakes[stakeList[_stakeholder]].timestamp) / (1 minutes);
        return
            (((stakes[stakeList[_stakeholder]].value * ERC20ETHPrice) / 1e18) /
                1000) * stakingDays;
    }

    function claimReward() public {
        uint256 reward = calculateReward(msg.sender);

        require(reward > 0, "No Reward available !");
        require(
            (now - stakes[stakeList[msg.sender]].timestamp) > 1 minutes,
            "You have to stake at lease 1 day to claim rewards"
        );
        require(address(this).balance > 0, "No Reward Funds available !");

        stakes[stakeList[msg.sender]].timestamp = now;
        msg.sender.transfer(reward);

        emit RewardClaimed(msg.sender, reward);
    }

    function getERC20ETHPrice(address _ERC20Address)
        public
        view
        returns (int256)
    {
        AggregatorV3Interface priceFeedInterface =
            AggregatorV3Interface(priceFeed[_ERC20Address]);

        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = priceFeedInterface.latestRoundData();
        return price;
    }

    function rewardFunds() external view returns (uint256) {
        return address(this).balance;
    }

    function fundRewards() external payable onlyOwner {
        require(msg.value > 0, "No ETH to fund !");
        emit RewardsFunded(msg.value);
    }

    function refundRewards() external onlyOwner {
        msg.sender.transfer(address(this).balance);
        emit RewardsRefunded(address(this).balance);
    }
}
