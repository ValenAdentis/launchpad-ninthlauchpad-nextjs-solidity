// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {Launchpad} from "../src/Launchpad.sol";

/// @notice Deploy the Launchpad. Configuration can be overridden with environment variables:
///         OWNER, FEE_RECIPIENT, CREATION_FEE.
contract DeployLaunchpad is Script {
    function run() external returns (Launchpad launchpad) {
        address owner = vm.envOr("OWNER", msg.sender);
        address feeRecipient = vm.envOr("FEE_RECIPIENT", msg.sender);
        uint256 creationFee = vm.envOr("CREATION_FEE", uint256(0.001 ether));

        vm.startBroadcast();
        launchpad = new Launchpad(owner, feeRecipient, creationFee);
        vm.stopBroadcast();

        console2.log("Launchpad deployed at:", address(launchpad));
        console2.log("Owner:", owner);
        console2.log("Fee recipient:", feeRecipient);
        console2.log("Creation fee (wei):", creationFee);
    }
}
