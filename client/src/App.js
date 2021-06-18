import React, { Component } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import StakingContract from "./contracts/Staking.json";
import ERC20Contract from "./contracts/ERC20.json";
import AggregatorV3InterfaceABIContract from "./contracts/AggregatorV3InterfaceABI.json";
import getWeb3 from "./getWeb3";

import "./App.css";
import NavBar from "./components/navbar";

class App extends Component {
  state = {
    storageValue: 0,
    web3: null,
    accounts: null,
    contract: null,
    contractOwner: null,
    stakeValue: null,
    stakeToken: null,
    totalStakes: null,
    totalRewards: null,
    stakeReward: null,
    rewardFunds: null,
    ERC20Allowance: null,
    stakeValueInputError: null,
    annualRewardEstimate: 0,
  };

  componentWillMount = async () => {
    console.log("==> componentDidMount");
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();

      // Get the contract instance.
      const networkId = await web3.eth.net.getId();
      if (networkId !== 1337 && networkId !== 42) {
        alert(
          "Wrong Network(" +
            networkId +
            "). Please Switch to Alyra Network(1337) or Kovan Network(42) "
        );
        return;
      }
      const deployedNetwork = StakingContract.networks[networkId];
      const instance = new web3.eth.Contract(
        StakingContract.abi,
        deployedNetwork && deployedNetwork.address
      );

      // Set a timer to refresh the page every 10 seconds
      this.updateTimer = setInterval(() => this.refreshStakeRewards(), 10000);

      // Subscribe to events
      instance.events
        .ERC20Staked()
        .on("data", (event) => this.doWhenEvent(event))
        .on("error", console.error);
      instance.events
        .ERC20Unstaked()
        .on("data", (event) => this.doWhenEvent(event))
        .on("error", console.error);
      instance.events
        .RewardClaimed()
        .on("data", (event) => this.doWhenEvent(event))
        .on("error", console.error);
      instance.events
        .RewardsFunded()
        .on("data", (event) => this.doWhenEvent(event))
        .on("error", console.error);
      instance.events
        .RewardsRefunded()
        .on("data", (event) => this.doWhenEvent(event))
        .on("error", console.error);

      // Set web3, accounts, and contract to the state, and then proceed with an
      // example of interacting with the contract's methods.
      this.setState({ web3, accounts, contract: instance }, this.runInit);
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
      console.error(error);
    }
  };

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  doWhenEvent = async (data) => {
    console.log("==> doWhenEvent", data.event);

    switch (data.event) {
      case "ERC20Staked":
      case "ERC20Unstaked":
      case "RewardClaimed":
      case "RewardsDistrubuted":
      case "RewardsFunded":
      case "RewardsRefunded":
        this.runInit();
        break;
      default:
        console.log("Event not managed");
    }
  };

  convertAddressToToken(tokenAddress) {
    switch (tokenAddress) {
      case "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa":
        return "DAI";
      case "0x02D9844E6c67B6251eDf631f0eC72C4D545e6eAb":
        return "ALY";
      default:
        return "DAI";
    }
  }

  runInit = async () => {
    console.log("==> runInit");
    const { web3, contract, accounts } = this.state;
    const contractOwner = await contract.methods.owner().call();
    console.log("==> runInit 1");
    const stakeValue = await contract.methods.stakeOf(accounts[0]).call();
    console.log("==> runInit 2");
    const stakeToken = await contract.methods.stakeTokenOf(accounts[0]).call();
    console.log("==> runInit 3");
    const totalStakes = await contract.methods.totalStakes().call();
    const totalRewards = await contract.methods.totalRewards().call();
    //const totalRewards = "0";
    const stakeReward = await contract.methods
      .calculateReward(accounts[0])
      .call();
    const rewardFunds = await contract.methods.rewardFunds().call();

    const ERC20instance = new web3.eth.Contract(
      ERC20Contract.abi,
      "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa"
    );
    const ERC20Allowance = await ERC20instance.methods
      .allowance(accounts[0], contract._address)
      .call();

    this.setState({
      contractOwner: contractOwner,
      stakeValue: stakeValue,
      stakeToken: stakeToken,
      totalStakes: totalStakes,
      totalRewards: totalRewards,
      stakeReward: stakeReward,
      rewardFunds: rewardFunds,
      ERC20Allowance: ERC20Allowance,
      stakeValueInputError: null,
    });
  };

  refreshStakeRewards = async () => {
    console.log("==> refreshStakeRewards");
    const { contract, accounts } = this.state;
    const stakeReward = await contract.methods
      .calculateReward(accounts[0])
      .call();
    console.log("==> refreshStakeRewards 1");
    const totalStakes = await contract.methods.totalStakes().call();
    console.log("==> refreshStakeRewards 2");
    const totalRewards = await contract.methods.totalRewards().call();
    console.log("==> refreshStakeRewards 3");
    this.setState({
      stakeReward: stakeReward,
      totalStakes: totalStakes,
      totalRewards: totalRewards,
    });
  };

  handleStake = async () => {
    console.log("handleStake");
    const { web3, accounts, contract } = this.state;
    const stakeToken = this.stakeToken.value;
    const stakeValue = this.stakeValue.value;

    if (stakeValue == null || stakeValue <= 0) {
      this.setState({
        stakeValueInputError: "Please, enter an Token amount > 0",
      });
      return;
    }
    await contract.methods
      .stake(stakeToken, web3.utils.toWei(stakeValue, "ether"))
      .send({
        from: accounts[0],
      });
    this.runInit();
  };

  handleUnstake = async () => {
    console.log("handleUnstake");
    const { accounts, contract } = this.state;

    await contract.methods.unstake().send({
      from: accounts[0],
    });
    this.runInit();
  };

  handleFundRewards = async () => {
    console.log("handleFundRewards");
    const { web3, contract, accounts } = this.state;
    await contract.methods.fundRewards().send({
      from: accounts[0],
      value: web3.utils.toWei("0.1", "ether"),
    });
    this.runInit();
  };

  handleRefundRewards = async () => {
    console.log("handleRefundRewards");
    const { accounts, contract } = this.state;
    await contract.methods.refundRewards().send({
      from: accounts[0],
    });
    this.runInit();
  };

  handleClaimReward = async () => {
    console.log("handleClaimReward");
    const { accounts, contract } = this.state;
    await contract.methods.claimReward().send({
      from: accounts[0],
    });
    this.runInit();
  };

  handleApprove = async () => {
    console.log("handleApprove");
    const { web3, accounts, contract } = this.state;
    const tokenAddress = this.stakeToken.value;
    const ERC20instance = new web3.eth.Contract(
      ERC20Contract.abi,
      tokenAddress
    );
    await ERC20instance.methods
      .approve(contract._address, web3.utils.toWei("1000000000", "ether"))
      .send({
        from: accounts[0],
      });
    this.runInit();
  };

  handleTokenChange = async (event) => {
    console.log("handleTokenChange");
    const { web3, accounts, contract } = this.state;
    const stakeToken = this.stakeToken.value;
    const ERC20instance = new web3.eth.Contract(ERC20Contract.abi, stakeToken);
    const ERC20Allowance = await ERC20instance.methods
      .allowance(accounts[0], contract._address)
      .call();
    //event.preventDefault();
    this.setState({
      ERC20Allowance: ERC20Allowance,
    });
    this.handleTokenValueChange();
  };

  handleTokenValueChange = async () => {
    console.log("handleTokenValueChange");
    const { web3 } = this.state;
    if (this.stakeValue == null) return;
    const tokenAddress = this.stakeToken.value;
    const tokenValue = this.stakeValue.value;
    let priceFeedAddress = null;
    switch (tokenAddress) {
      case "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa":
        // DAI/ETH
        priceFeedAddress = "0x22B58f1EbEDfCA50feF632bD73368b2FdA96D541";
        break;
      case "0x02D9844E6c67B6251eDf631f0eC72C4D545e6eAb":
        //ALY/ETH (AAVE/ETH)
        priceFeedAddress = "0xd04647B7CB523bb9f26730E9B6dE1174db7591Ad";
        break;
      default:
        // DAI/ETH
        priceFeedAddress = "0x22B58f1EbEDfCA50feF632bD73368b2FdA96D541";
    }
    const priceFeedContract = new web3.eth.Contract(
      AggregatorV3InterfaceABIContract.abi,
      priceFeedAddress
    );
    const priceFeedResult = await priceFeedContract.methods
      .latestRoundData()
      .call();
    const annualRewardEstimate = (
      tokenValue *
      (priceFeedResult[1] / 1000000000000000000 / 1000) *
      3600 *
      24 *
      365
    ).toFixed(2);
    this.setState({
      annualRewardEstimate: annualRewardEstimate,
      stakeValueInputError: null,
    });
  };

  renderStakingAction() {
    console.log("==> renderStakingAction");
    const {
      ERC20Allowance,
      stakeValue,
      stakeReward,
      stakeValueInputError,
      annualRewardEstimate,
    } = this.state;
    return (
      <React.Fragment>
        <br></br>
        <div className="row">
          <div className="col-sm-12">
            <div className="card text-center">
              <div className="card-header">
                <strong>Stake/Unstake</strong>
              </div>
              <div className="card-body">
                <div className="row">
                  {stakeValue == 0 && (
                    <div className="col-sm-3 offset-1">
                      <select
                        className="form-select form-select-sm"
                        aria-label=".form-select-sm example"
                        onChange={this.handleTokenChange}
                        ref={(input) => {
                          this.stakeToken = input;
                        }}
                      >
                        <option value="0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa">
                          DAI
                        </option>
                        <option value="0x02D9844E6c67B6251eDf631f0eC72C4D545e6eAb">
                          ALY
                        </option>
                      </select>
                    </div>
                  )}
                  {ERC20Allowance == 0 && (
                    <div className="col-sm-3 offset-4">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={this.handleApprove}
                      >
                        <b>Approve</b>
                      </button>
                    </div>
                  )}
                  {ERC20Allowance > 0 && stakeValue == 0 && (
                    <div className="col-sm-3 offset-1">
                      <input
                        type="text"
                        id="stakeValue"
                        className={
                          "form-control" +
                          (stakeValueInputError == null ? "" : " is-invalid")
                        }
                        ref={(input) => {
                          this.stakeValue = input;
                        }}
                        placeholder="Token amount"
                        onChange={this.handleTokenValueChange}
                      ></input>
                      <div className="invalid-feedback">
                        {stakeValueInputError}
                      </div>
                    </div>
                  )}
                  {ERC20Allowance > 0 && stakeValue == 0 && (
                    <div className="col-sm-3 offset-1">
                      <button
                        type="button"
                        className="btn btn-success"
                        onClick={this.handleStake}
                      >
                        <b>Stake</b>
                      </button>
                    </div>
                  )}
                  {ERC20Allowance > 0 && stakeValue > 0 && (
                    <div className="col-sm-6 offset-3">
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={this.handleUnstake}
                      >
                        <b>Unstake</b>
                      </button>
                    </div>
                  )}
                  <br></br>
                </div>
                <br></br>
                {ERC20Allowance > 0 && stakeValue == 0 && (
                  <div className="row">
                    <div className="col-sm-6 offset-1">
                      <p>
                        <b>Annual Reward Estimate: </b>
                      </p>
                    </div>
                    <div className="col-sm-4 offset-1">
                      <p>{annualRewardEstimate} ETH</p>
                    </div>
                  </div>
                )}
                <div className="row">
                  {stakeReward > 0 && (
                    <div className="col-sm-6 offset-3">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={this.handleClaimReward}
                      >
                        <b>Claim your rewards</b>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <br></br>
      </React.Fragment>
    );
  }

  renderStakingStatus() {
    console.log("==> renderStakingStatus");
    const { web3, stakeValue, stakeToken, stakeReward } = this.state;
    return (
      <React.Fragment>
        <br></br>
        <div className="row">
          <div className="col-sm-12">
            <div className="card text-center">
              <div className="card-header">
                <strong>Staking Status</strong>
              </div>
              {stakeValue > 0 ? (
                <div className="card-body">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th scope="col">Token</th>
                        <th scope="col">Value</th>
                        <th scope="col">Rewards</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{this.convertAddressToToken(stakeToken)}</td>
                        <td>{web3.utils.fromWei(stakeValue, "ether")}</td>
                        <td>{web3.utils.fromWei(stakeReward, "ether")}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="card-body">
                  <p>No Staking</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }

  renderStakingAdmin() {
    console.log("==> renderStakingAdmin");
    const { web3, rewardFunds, totalStakes, totalRewards } = this.state;
    return (
      <React.Fragment>
        <div className="row">
          <div className="col-sm-12">
            <div className="card text-center">
              <div className="card-header">
                <strong>Staking Admin</strong>
              </div>
              <div className="card-body">
                <div className="row">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th scope="col">Total Stakes</th>
                        <th scope="col">Total Rewards</th>
                        <th scope="col">Reward Funds</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{web3.utils.fromWei(totalStakes, "ether")}</td>
                        <td>{web3.utils.fromWei(totalRewards, "ether")}</td>
                        <td>{web3.utils.fromWei(rewardFunds, "ether")}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="row">
                  <div className="col-sm-4 offset-2">
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={this.handleFundRewards}
                    >
                      Fund Rewards
                    </button>
                  </div>
                  <div className="col-sm-4">
                    {rewardFunds > 0 && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={this.handleRefundRewards}
                      >
                        Refund Rewards
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }

  renderStakingInfo() {
    console.log("==> renderStakingInfo");
    return (
      <React.Fragment>
        <br></br>
        <div className="row">
          <div className="col-sm-12">
            <div className="card text-center bg-info text-white">
              <div className="card-header">
                <strong>Staking Dapp Information</strong>
              </div>
              <div className="card-body">
                <div className="row">
                  <p>
                    Stake your favorite ERC20 token and earn, each minutes,
                    1/1000 of the token value in ETH !
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }

  render() {
    console.log("==> render");
    if (!this.state.web3) {
      return <div>Loading Web3, accounts, and contract...</div>;
    }
    return (
      <React.Fragment>
        <NavBar
          contractOwner={this.state.contractOwner}
          userAccount={this.state.accounts[0]}
        />
        <main className="container">
          <div className="row">
            <div className="col-8 offset-2 text-center">
              {this.renderStakingInfo()}
            </div>
          </div>
          <div className="row">
            <div className="col-8 offset-2 text-center">
              {this.renderStakingStatus()}
            </div>
          </div>
          <div className="row">
            <div className="col-8 offset-2 text-center">
              {this.renderStakingAction()}
            </div>
          </div>
          {this.state.contractOwner === this.state.accounts[0] && (
            <div className="row">
              <div className="col-8 offset-2 text-center">
                {this.renderStakingAdmin()}
              </div>
            </div>
          )}
        </main>
      </React.Fragment>
    );
  }
}

export default App;
