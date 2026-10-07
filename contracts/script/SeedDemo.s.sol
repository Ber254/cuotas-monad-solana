// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {InstallmentRegistry} from "../src/InstallmentRegistry.sol";

/// Crea la obligación demo de Finvia: una PYME compra mercadería por USD 10.000 a un proveedor, que le
/// financia la compra: la PYME firma 10 pagarés (cuotas) mensuales de 1.000 USDC. La crea el proveedor/acreedor (`seller` en el contrato); la PYME es el `buyer`.
/// Uso: REGISTRY_ADDRESS=0x... BUYER_ADDRESS=<PYME> SELLER_SOLANA_ADDRESS=<base58 acreedor> \
///      forge script script/SeedDemo.s.sol --rpc-url <rpc> --private-key <pk acreedor> --broadcast
contract SeedDemo is Script {
    function run() external returns (uint256 obligationId) {
        InstallmentRegistry registry = InstallmentRegistry(vm.envAddress("REGISTRY_ADDRESS"));
        address buyer = vm.envAddress("BUYER_ADDRESS");
        string memory payTo = vm.envString("SELLER_SOLANA_ADDRESS");
        vm.startBroadcast();
        obligationId = registry.createObligation(
            "Compra de mercaderia a credito", buyer, payTo, 1_000e6, 10, uint64(block.timestamp + 30 days), 30 days
        );
        vm.stopBroadcast();
        console.log("obligationId:", obligationId);
    }
}
