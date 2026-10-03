// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {InstallmentRegistry} from "../src/InstallmentRegistry.sol";

contract InstallmentRegistryTest is Test {
    InstallmentRegistry registry;
    address verifier = makeAddr("verifier");
    address alice = makeAddr("alice"); // vendedor
    address bob = makeAddr("bob"); // comprador
    address eve = makeAddr("eve");
    string constant PAY_TO = "AliceSo1anaPubkey11111111111111111111111111";
    uint64 constant MONTH = 30 days;

    function setUp() public {
        vm.warp(1_800_000_000);
        registry = new InstallmentRegistry(verifier);
    }

    function _createDemo() internal returns (uint256 id) {
        vm.prank(alice);
        id = registry.createObligation("Celular", bob, PAY_TO, 100e6, 10, uint64(block.timestamp + MONTH), MONTH);
    }

    function _ref(uint8 n) internal pure returns (string memory) {
        return string(abi.encodePacked("solana-tx-", vm.toString(uint256(n))));
    }

    function test_createObligation_generatesInstallments() public {
        uint256 id = _createDemo();
        assertEq(id, 1);
        InstallmentRegistry.Obligation memory o = registry.getObligation(id);
        assertEq(o.seller, alice);
        assertEq(o.buyer, bob);
        assertEq(o.installmentCount, 10);
        assertEq(o.installmentAmount, 100e6);
        assertEq(uint8(o.status), uint8(InstallmentRegistry.ObligationStatus.ACTIVE));

        InstallmentRegistry.InstallmentView[] memory list = registry.getInstallments(id);
        assertEq(list.length, 10);
        for (uint8 i = 0; i < 10; i++) {
            assertEq(list[i].number, i + 1);
            assertEq(list[i].obligationId, id);
            assertEq(list[i].amount, 100e6);
            assertEq(list[i].dueDate, o.firstDueDate + uint64(i) * MONTH);
            assertEq(uint8(list[i].status), uint8(InstallmentRegistry.InstallmentStatus.PENDING));
            assertEq(list[i].buyer, bob);
            assertEq(list[i].seller, alice);
        }
        assertEq(registry.getObligationsByBuyer(bob)[0], id);
        assertEq(registry.getObligationsBySeller(alice)[0], id);
    }

    function test_createObligation_rejectsInvalidParams() public {
        vm.startPrank(alice);
        vm.expectRevert(InstallmentRegistry.InvalidParams.selector);
        registry.createObligation("x", address(0), PAY_TO, 100e6, 10, 1, MONTH);
        vm.expectRevert(InstallmentRegistry.InvalidParams.selector);
        registry.createObligation("x", alice, PAY_TO, 100e6, 10, 1, MONTH);
        vm.expectRevert(InstallmentRegistry.InvalidParams.selector);
        registry.createObligation("x", bob, PAY_TO, 0, 10, 1, MONTH);
        vm.expectRevert(InstallmentRegistry.InvalidParams.selector);
        registry.createObligation("x", bob, PAY_TO, 100e6, 0, 1, MONTH);
        vm.expectRevert(InstallmentRegistry.InvalidParams.selector);
        registry.createObligation("x", bob, PAY_TO, 100e6, 61, 1, MONTH);
        vm.expectRevert(InstallmentRegistry.InvalidParams.selector);
        registry.createObligation("x", bob, PAY_TO, 100e6, 10, 1, 0);
        vm.expectRevert(InstallmentRegistry.InvalidParams.selector);
        registry.createObligation("x", bob, "", 100e6, 10, 1, MONTH);
        vm.stopPrank();
    }

    function test_markPaid_byVerifier() public {
        uint256 id = _createDemo();
        vm.prank(verifier);
        registry.markInstallmentPaid(id, 1, "sig1");
        InstallmentRegistry.InstallmentView memory inst = registry.getInstallment(id, 1);
        assertEq(uint8(inst.status), uint8(InstallmentRegistry.InstallmentStatus.PAID));
        assertEq(inst.paymentRef, "sig1");
        assertEq(inst.paidAt, block.timestamp);
        assertEq(registry.getObligation(id).paidCount, 1);
    }

    function test_markPaid_bySeller() public {
        uint256 id = _createDemo();
        vm.prank(alice);
        registry.markInstallmentPaid(id, 3, "manual-receipt-3");
        assertEq(uint8(registry.getInstallment(id, 3).status), uint8(InstallmentRegistry.InstallmentStatus.PAID));
    }

    function test_markPaid_rejectsUnauthorized() public {
        uint256 id = _createDemo();
        vm.prank(bob);
        vm.expectRevert(InstallmentRegistry.NotAuthorized.selector);
        registry.markInstallmentPaid(id, 1, "sig");
        vm.prank(eve);
        vm.expectRevert(InstallmentRegistry.NotAuthorized.selector);
        registry.markInstallmentPaid(id, 1, "sig");
    }

    function test_markPaid_rejectsDoublePayAndRefReuse() public {
        uint256 id = _createDemo();
        vm.startPrank(verifier);
        registry.markInstallmentPaid(id, 1, "sig1");
        vm.expectRevert(InstallmentRegistry.AlreadyPaid.selector);
        registry.markInstallmentPaid(id, 1, "sig1b");
        vm.expectRevert(InstallmentRegistry.PaymentRefAlreadyUsed.selector);
        registry.markInstallmentPaid(id, 2, "sig1");
        vm.expectRevert(InstallmentRegistry.InvalidParams.selector);
        registry.markInstallmentPaid(id, 2, "");
        vm.stopPrank();
    }

    function test_markPaid_rejectsUnknownObligationOrNumber() public {
        uint256 id = _createDemo();
        vm.startPrank(verifier);
        vm.expectRevert(InstallmentRegistry.ObligationNotFound.selector);
        registry.markInstallmentPaid(99, 1, "sig");
        vm.expectRevert(InstallmentRegistry.InstallmentNotFound.selector);
        registry.markInstallmentPaid(id, 0, "sig");
        vm.expectRevert(InstallmentRegistry.InstallmentNotFound.selector);
        registry.markInstallmentPaid(id, 11, "sig");
        vm.stopPrank();
    }

    function test_overdueIsDerivedFromTime() public {
        uint256 id = _createDemo();
        uint64 due1 = registry.getInstallment(id, 1).dueDate;
        vm.warp(due1);
        assertEq(uint8(registry.getInstallment(id, 1).status), uint8(InstallmentRegistry.InstallmentStatus.PENDING));
        vm.warp(due1 + 1);
        assertEq(uint8(registry.getInstallment(id, 1).status), uint8(InstallmentRegistry.InstallmentStatus.OVERDUE));
        assertEq(uint8(registry.getInstallment(id, 2).status), uint8(InstallmentRegistry.InstallmentStatus.PENDING));
        vm.prank(verifier);
        registry.markInstallmentPaid(id, 1, "late-sig");
        assertEq(uint8(registry.getInstallment(id, 1).status), uint8(InstallmentRegistry.InstallmentStatus.PAID));
    }

    function test_allPaid_completesObligation() public {
        uint256 id = _createDemo();
        vm.startPrank(verifier);
        for (uint8 n = 10; n >= 2; n--) {
            registry.markInstallmentPaid(id, n, _ref(n));
            assertEq(uint8(registry.getObligation(id).status), uint8(InstallmentRegistry.ObligationStatus.ACTIVE));
        }
        vm.expectEmit(true, false, false, false);
        emit InstallmentRegistry.ObligationCompleted(id);
        registry.markInstallmentPaid(id, 1, _ref(1));
        vm.stopPrank();
        InstallmentRegistry.Obligation memory o = registry.getObligation(id);
        assertEq(o.paidCount, 10);
        assertEq(uint8(o.status), uint8(InstallmentRegistry.ObligationStatus.COMPLETED));
    }

    function test_setVerifier_onlyOwner() public {
        vm.prank(eve);
        vm.expectRevert(InstallmentRegistry.NotOwner.selector);
        registry.setVerifier(eve);
        registry.setVerifier(eve);
        assertEq(registry.verifier(), eve);
    }
}
