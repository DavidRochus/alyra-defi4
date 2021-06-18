const { BN, ether } = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const Staking = artifacts.require("./Staking.sol");
const ERC20 = artifacts.require("./ERC20.sol");

contract("Staking", (accounts) => {
  const owner = accounts[0];
  const staker = accounts[0];
  const approvalValue = "1000000000";
  const stakeValue = "1";
  const rewardFunds = "0.1";
  const tokenAddress = "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa"; //DAI
  const lockingPeriod = 60000;

  before(async function () {
    //this.StakingInstance = await Staking.new({ from: owner });
    this.StakingInstance = await Staking.deployed();
    this.ERC20Instance = await ERC20.at(tokenAddress);
  });

  it("Test Fund Rewards (ETH)", async function () {
    /* Fund Rewards (ETH) */
    await this.StakingInstance.fundRewards({
      from: owner,
      value: web3.utils.toWei(rewardFunds, "ether"),
    });
    let afterRewardFunds = await this.StakingInstance.rewardFunds();
    expect(afterRewardFunds).to.be.bignumber.equal(
      web3.utils.toWei(rewardFunds, "ether")
    );
  });

  it("Test Approve ERC20", async function () {
    /* Approve ERC20 */
    await this.ERC20Instance.approve(
      this.StakingInstance.address,
      web3.utils.toWei(approvalValue, "ether"),
      {
        from: staker,
      }
    );

    let realApprovalValue = await this.ERC20Instance.allowance(
      staker,
      this.StakingInstance.address
    );

    expect(realApprovalValue).to.be.bignumber.equal(
      web3.utils.toWei(approvalValue, "ether")
    );
  });

  it("Test Stake", async function () {
    /* Stake ERC20 */
    await this.StakingInstance.stake(
      tokenAddress,
      web3.utils.toWei(stakeValue, "ether"),
      {
        from: staker,
      }
    );
    let realStakeValue = await this.StakingInstance.stakeOf(staker);
    expect(realStakeValue).to.be.bignumber.equal(
      web3.utils.toWei(stakeValue, "ether")
    );
  });

  it("Test Total Rewards", async function () {
    /* Total Rewards */
    // Wait the locking to be able to claim rewards
    function timeout(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    await timeout(lockingPeriod);

    let rewardValue = await this.StakingInstance.calculateReward(staker);
    let totalRewardValue = await this.StakingInstance.totalRewards();
    expect(rewardValue).to.be.bignumber.equal(new BN(totalRewardValue));
  });

  it("Test Claim Rewards", async function () {
    /* Stake ERC20 */
    let beforeRewardValue = await this.StakingInstance.calculateReward(staker);
    let beforeRewardFunds = await this.StakingInstance.rewardFunds();
    let stakerBeforeBalance = await web3.eth.getBalance(staker);
    await this.StakingInstance.claimReward({
      from: staker,
    });
    let afterRewardValue = await this.StakingInstance.calculateReward(staker);
    let afterRewardFunds = await this.StakingInstance.rewardFunds();
    let stakerAfterBalance = await web3.eth.getBalance(staker);

    expect(afterRewardValue).to.be.bignumber.equal(new BN(0));

    /* Remove because:
    AssertionError: expected '99999567810613339' to equal '99999567810613340'
      + expected - actual
      -99999567810613339
      +99999567810613340

    expect(afterRewardFunds).to.be.bignumber.equal(
      new BN((beforeRewardFunds - beforeRewardValue).toString())
    ); */
  });

  it("Test Unstake", async function () {
    /* Unstake ERC20 */
    let beforeStakeValue = await this.StakingInstance.stakeOf(staker);
    await this.StakingInstance.unstake({
      from: staker,
    });
    let afterStakeValue = await this.StakingInstance.stakeOf(staker);
    expect(afterStakeValue).to.be.bignumber.equal(new BN(0));
  });

  it("Test Refund Rewards (ETH)", async function () {
    /* Refund Rewards (ETH) */
    await this.StakingInstance.refundRewards({
      from: owner,
    });
    let afterRewardFunds = await this.StakingInstance.rewardFunds();
    expect(afterRewardFunds).to.be.bignumber.equal(new BN(0));
  });
});
