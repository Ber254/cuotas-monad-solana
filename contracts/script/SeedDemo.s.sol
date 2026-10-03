// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {InstallmentRegistry} from "../src/InstallmentRegistry.sol";

/// Crea la obligación demo (Celular, 10 cuotas de 100 USDC, mensual) desde la cuenta vendedor.
/// Uso: REGISTRY_ADDRESS=0x... BUYER_ADDRESS=0x... SELLER_SOLANA_ADDRESS=<base58> \
///      forge script script/SeedDemo.s.sol --rpc-url <rpc> --private-key <pk vendedor> --broadcast
contract SeedDemo is Script {
    function run() external returns (uint256 obligationId) {
        InstallmentRegistry registry = InstallmentRegistry(vm.envAddress("REGISTRY_ADDRESS"));
        address buyer = vm.envAddress("BUYER_ADDRESS");
        string memory payTo = vm.envString("SELLER_SOLANA_ADDRESS");
        vm.startBroadcast();
        obligationId =
            registry.createObligation("Celular", buyer, payTo, 100e6, 10, uint64(block.timestamp + 30 days), 30 days);
        vm.stopBroadcast();
        console.log("obligationId:", obligationId);
    }
}
