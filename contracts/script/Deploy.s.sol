// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {InstallmentRegistry} from "../src/InstallmentRegistry.sol";

/// Uso: VERIFIER_ADDRESS=0x... forge script script/Deploy.s.sol --rpc-url <rpc> --private-key <pk> --broadcast
contract Deploy is Script {
    function run() external returns (InstallmentRegistry registry) {
        address verifier = vm.envOr("VERIFIER_ADDRESS", msg.sender);
        vm.startBroadcast();
        registry = new InstallmentRegistry(verifier);
        vm.stopBroadcast();
        console.log("InstallmentRegistry:", address(registry));
        console.log("verifier:", verifier);
    }
}
