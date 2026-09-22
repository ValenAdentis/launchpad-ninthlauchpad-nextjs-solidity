// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title LaunchToken
/// @notice A fixed-supply ERC20 created by the {Launchpad}. The entire supply is minted
///         to the launchpad, which releases tokens to buyers along a bonding curve.
contract LaunchToken is ERC20 {
    /// @notice The launchpad that deployed this token.
    address public immutable launchpad;

    /// @notice The address that created the launch.
    address public immutable creator;

    error NotLaunchpad();
    error ZeroAddress();

    modifier onlyLaunchpad() {
        if (msg.sender != launchpad) revert NotLaunchpad();
        _;
    }

    constructor(string memory name_, string memory symbol_, uint256 totalSupply_, address creator_)
        ERC20(name_, symbol_)
    {
        if (creator_ == address(0)) revert ZeroAddress();
        launchpad = msg.sender;
        creator = creator_;
        _mint(msg.sender, totalSupply_);
    }

    /// @notice Burn tokens held by the launchpad (used when a launch is retired).
    function burn(uint256 amount) external onlyLaunchpad {
        _burn(msg.sender, amount);
    }
}
