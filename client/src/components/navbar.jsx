import React, { Component } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

class NavBar extends Component {
  //state = {  }

  renderUserAccount() {
    if (this.props.userAccount === this.props.contractOwner) {
      return (
        <span className="badge rounded-pill bg-danger">
          {this.props.userAccount.substring(0, 5) +
            "..." +
            this.props.userAccount.substring(
              this.props.userAccount.length - 3,
              this.props.userAccount.length
            )}
        </span>
      );
    } else {
      return (
        <span className="badge rounded-pill bg-primary">
          {this.props.userAccount.substring(0, 5) +
            "..." +
            this.props.userAccount.substring(
              this.props.userAccount.length - 3,
              this.props.userAccount.length
            )}
        </span>
      );
    }
  }

  render() {
    return (
      <nav className="navbar navbar-light bg-light">
        <div className="container-fluid">
          <span className="navbar-brand mb-0 h1">
            <strong>Staking Dapp</strong>
          </span>
          {this.renderUserAccount()}
        </div>
      </nav>
    );
  }
}

export default NavBar;
