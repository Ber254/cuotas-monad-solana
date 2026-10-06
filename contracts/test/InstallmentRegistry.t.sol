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

    // ───────────── cesión de pagarés ─────────────
    address carol = makeAddr("carol"); // nuevo acreedor
    string constant CAROL_SOL = "CarolSo1anaPubkey1111111111111111111111111";

    function _nums(uint8 from, uint8 to) internal pure returns (uint8[] memory a) {
        a = new uint8[](to - from + 1);
        for (uint8 i = 0; i < a.length; i++) {
            a[i] = from + i;
        }
    }

    function test_transfer_changesCreditorOnlyForSelectedInstallments() public {
        uint256 id = _createDemo();
        vm.expectEmit(true, true, true, true);
        emit InstallmentRegistry.InstallmentTransferred(id, 6, carol, alice, CAROL_SOL);
        vm.prank(alice);
        registry.transferInstallments(id, _nums(6, 10), carol, CAROL_SOL);

        InstallmentRegistry.InstallmentView[] memory list = registry.getInstallments(id);
        for (uint8 i = 0; i < 10; i++) {
            bool ceded = list[i].number >= 6;
            assertEq(list[i].creditor, ceded ? carol : alice);
            assertEq(list[i].creditorSolanaAddress, ceded ? CAROL_SOL : PAY_TO);
            assertEq(list[i].seller, alice, "el vendedor original no cambia");
            assertEq(list[i].buyer, bob);
        }
        assertEq(registry.getObligationsByCreditor(carol).length, 1);
        assertEq(registry.getObligationsByCreditor(carol)[0], id);
    }

    function test_transfer_onlyCurrentCreditorCanTransfer() public {
        uint256 id = _createDemo();
        address[3] memory nope = [bob, eve, verifier];
        for (uint256 i = 0; i < nope.length; i++) {
            vm.prank(nope[i]);
            vm.expectRevert(InstallmentRegistry.NotAuthorized.selector);
            registry.transferInstallments(id, _nums(1, 1), carol, CAROL_SOL);
        }
        // tras ceder, el vendedor original ya no puede volver a ceder ese pagaré
        vm.prank(alice);
        registry.transferInstallments(id, _nums(1, 1), carol, CAROL_SOL);
        vm.prank(alice);
        vm.expectRevert(InstallmentRegistry.NotAuthorized.selector);
        registry.transferInstallments(id, _nums(1, 1), eve, "EveSol");
        // pero Carol sí puede re-ceder
        vm.prank(carol);
        registry.transferInstallments(id, _nums(1, 1), eve, "EveSol");
        assertEq(registry.getInstallment(id, 1).creditor, eve);
        assertEq(registry.getInstallment(id, 1).creditorSolanaAddress, "EveSol");
    }

    function test_transfer_rejectsInvalidParamsAndPaid() public {
        uint256 id = _createDemo();
        vm.startPrank(alice);
        vm.expectRevert(InstallmentRegistry.InvalidParams.selector);
        registry.transferInstallments(id, new uint8[](0), carol, CAROL_SOL); // sin cuotas
        vm.expectRevert(InstallmentRegistry.InvalidParams.selector);
        registry.transferInstallments(id, _nums(1, 1), address(0), CAROL_SOL);
        vm.expectRevert(InstallmentRegistry.InvalidParams.selector);
        registry.transferInstallments(id, _nums(1, 1), bob, CAROL_SOL); // el deudor no puede ser acreedor
        vm.expectRevert(InstallmentRegistry.InvalidParams.selector);
        registry.transferInstallments(id, _nums(1, 1), carol, ""); // sin cuenta Solana
        vm.expectRevert(InstallmentRegistry.InvalidParams.selector);
        registry.transferInstallments(id, _nums(1, 1), alice, PAY_TO); // a sí mismo
        vm.expectRevert(InstallmentRegistry.InstallmentNotFound.selector);
        registry.transferInstallments(id, _nums(11, 11), carol, CAROL_SOL);
        uint8[] memory zero = new uint8[](1);
        vm.expectRevert(InstallmentRegistry.InstallmentNotFound.selector);
        registry.transferInstallments(id, zero, carol, CAROL_SOL);
        vm.expectRevert(InstallmentRegistry.ObligationNotFound.selector);
        registry.transferInstallments(99, _nums(1, 1), carol, CAROL_SOL);
        vm.stopPrank();

        vm.prank(verifier);
        registry.markInstallmentPaid(id, 2, "sig2");
        vm.prank(alice);
        vm.expectRevert(InstallmentRegistry.AlreadyPaid.selector);
        registry.transferInstallments(id, _nums(2, 2), carol, CAROL_SOL); // una cuota pagada no se cede
    }

    function test_transfer_isAtomic_oneBadInstallmentRevertsAll() public {
        uint256 id = _createDemo();
        vm.prank(alice);
        registry.transferInstallments(id, _nums(3, 3), carol, CAROL_SOL); // la 3 ya es de Carol
        vm.prank(alice);
        vm.expectRevert(InstallmentRegistry.NotAuthorized.selector);
        registry.transferInstallments(id, _nums(1, 4), eve, "EveSol"); // 1,2 propias, 3 ajena
        assertEq(registry.getInstallment(id, 1).creditor, alice, "no debe quedar cedida a medias");
        assertEq(registry.getInstallment(id, 2).creditor, alice);
    }

    function test_markPaid_afterTransfer_onlyNewCreditorOrVerifier() public {
        uint256 id = _createDemo();
        vm.prank(alice);
        registry.transferInstallments(id, _nums(5, 5), carol, CAROL_SOL);
        vm.prank(alice); // el vendedor original ya no cobra la 5
        vm.expectRevert(InstallmentRegistry.NotAuthorized.selector);
        registry.markInstallmentPaid(id, 5, "manual-alice");
        vm.prank(alice); // pero sí la 4, que sigue siendo suya
        registry.markInstallmentPaid(id, 4, "manual-alice-4");
        vm.prank(carol);
        registry.markInstallmentPaid(id, 5, "manual-carol-5");
        assertEq(uint8(registry.getInstallment(id, 5).status), uint8(InstallmentRegistry.InstallmentStatus.PAID));
        vm.prank(carol); // y Carol no puede marcar una cuota que no es suya
        vm.expectRevert(InstallmentRegistry.NotAuthorized.selector);
        registry.markInstallmentPaid(id, 6, "manual-carol-6");
        vm.prank(verifier); // el verifier sigue pudiendo con cualquiera
        registry.markInstallmentPaid(id, 6, "sig6");
    }

    function test_transfer_doesNotBreakCompletion() public {
        uint256 id = _createDemo();
        vm.prank(alice);
        registry.transferInstallments(id, _nums(1, 10), carol, CAROL_SOL);
        vm.startPrank(verifier);
        for (uint8 n = 1; n <= 10; n++) {
            registry.markInstallmentPaid(id, n, _ref(n));
        }
        vm.stopPrank();
        assertEq(uint8(registry.getObligation(id).status), uint8(InstallmentRegistry.ObligationStatus.COMPLETED));
    }
}
